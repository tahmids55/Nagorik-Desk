"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { issueUpdates, issues, stakeholders, users } from "../db/schema";
import { actionSession } from "../auth/guards";
import { destroyAllSessions } from "../auth/session";
import { audit } from "../security/audit";
import { rateLimit } from "../security/rate-limit";
import { claimMedia } from "../services/media";
import { addUpdate } from "../services/timeline";
import { authorityUserIds, notify, officeUserIds, voterIds } from "../services/notify";
import { invalidateReference } from "../queries/reference";
import { fail, ok, type ActionResult } from "@/lib/action";
import { DEADLINE_DAYS, LIMITS } from "@/lib/constants";
import { addWorkingDays } from "@/lib/working-days";
import { authorityTransition, officeTransition, type AuthorityAction, type OfficeAction } from "@/lib/workflow";
import { emailSchema, stakeholderSchema, triageSchema } from "@/lib/validation";
import { isUniqueViolation, parseInput } from "./_util";

export type FormState = ActionResult | null;

const MAX_PRIORITIES = 10;
const uuid = z.string().uuid();

async function lockIssue(tx: Parameters<Parameters<ReturnType<typeof db>["transaction"]>[0]>[0], id: string) {
  const [i] = await tx.select().from(issues).where(eq(issues.id, id)).for("update");
  return i ?? null;
}

// ───────────── MP office: triage ─────────────

export async function triageIssue(_prev: FormState, formData: FormData): Promise<FormState> {
  const a = await actionSession("issue:triage");
  if ("error" in a) return fail(a.error);
  const { user } = a.session;
  const parsed = parseInput(triageSchema, formData);
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const action = d.action as OfficeAction;

  if ((action === "reject" || action === "reopen") && d.note.length < 10) return fail("validation", { fields: { note: "note_short" } });
  if (d.note.length > LIMITS.noteMax) return fail("validation", { fields: { note: "note_long" } });
  if (action === "assign" && !d.stakeholderId) return fail("validation", { fields: { stakeholderId: "stakeholder_required" } });

  const result = await db().transaction(async (tx) => {
    const issue = await lockIssue(tx, d.issueId);
    if (!issue) return "not_found" as const;
    const to = officeTransition(action, issue.status as never);
    if (!to) return "invalid_transition" as const;

    const patch: Partial<typeof issues.$inferInsert> = { status: to, statusNote: d.note || null, updatedAt: new Date() };
    let stakeholderId = issue.stakeholderId;
    if (action === "assign") {
      const [s] = await tx.select().from(stakeholders).where(eq(stakeholders.id, d.stakeholderId!));
      if (!s || !s.active) return "stakeholder_required" as const;
      if (s.upazilaId && s.upazilaId !== issue.upazilaId) return "stakeholder_area_mismatch" as const;
      const sameOffice = issue.stakeholderId === s.id && issue.status === "assigned";
      stakeholderId = s.id;
      patch.stakeholderId = s.id;
      patch.assignedAt = new Date();
      patch.acknowledgedAt = null;
      patch.dueAt = addWorkingDays(new Date(), d.deadlineDays ?? (issue.isUrgent ? DEADLINE_DAYS.urgent : DEADLINE_DAYS.normal));
      if (sameOffice) patch.statusNote = d.note || issue.statusNote;
    }
    if (action === "reject") {
      patch.stakeholderId = null;
      patch.dueAt = null;
    }
    if (action === "reopen") {
      patch.resolvedAt = null;
      patch.confirmedAt = null;
      patch.dueAt = null;
      patch.stakeholderId = null;
    }
    await tx.update(issues).set(patch).where(eq(issues.id, issue.id));
    await addUpdate(tx, {
      issueId: issue.id,
      actorId: user.id,
      actorRole: "office",
      actorLabel: user.officeTitle ?? "MP Office",
      kind: action === "assign" ? "assignment" : "status",
      fromStatus: issue.status,
      toStatus: to,
      body: d.note,
      stakeholderId,
      meta: action === "assign" ? { dueAt: (patch.dueAt as Date).toISOString() } : undefined,
    });
    await audit({ actorId: user.id, action: `issue.${action}`, targetType: "issue", targetId: issue.id, meta: { from: issue.status, to } }, tx);
    return { issue, to, stakeholderId };
  });

  if (typeof result === "string") return fail(result);
  const { issue, to, stakeholderId } = result;
  const audience = new Set([issue.authorId, ...(action === "assign" || action === "reject" ? await voterIds(issue.id) : [])]);
  await notify([...audience], "status", { issueId: issue.id, data: { to } }, undefined);
  if (action === "assign" && stakeholderId) await notify(await authorityUserIds(stakeholderId), "assigned", { issueId: issue.id });
  revalidatePath(`/issues/${issue.id}`);
  revalidatePath("/office");
  return ok();
}

const officeNoteSchema = z.object({ issueId: uuid, note: z.string().transform((s) => s.trim()).pipe(z.string().min(5, "note_short").max(LIMITS.noteMax, "note_long")) });

/** Public message from the MP office on an issue, without changing its status. */
export async function postOfficeNote(_prev: FormState, formData: FormData): Promise<FormState> {
  const a = await actionSession("issue:triage");
  if ("error" in a) return fail(a.error);
  const { user } = a.session;
  const parsed = parseInput(officeNoteSchema, formData);
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const res = await db().transaction(async (tx) => {
    const issue = await lockIssue(tx, d.issueId);
    if (!issue) return null;
    await addUpdate(tx, { issueId: issue.id, actorId: user.id, actorRole: "office", actorLabel: user.officeTitle ?? "MP Office", kind: "note", body: d.note, stakeholderId: issue.stakeholderId });
    return issue;
  });
  if (!res) return fail("not_found");
  await notify([res.authorId], "official_note", { issueId: res.id });
  revalidatePath(`/issues/${res.id}`);
  return ok();
}

// ───────────── MP office: priority (public commitment) ─────────────

const prioritySchema = z.object({
  issueId: uuid,
  on: z.enum(["1", "0"]),
  commitment: z.string().optional().transform((s) => (s ?? "").trim()),
  targetDate: z.string().optional().transform((s) => (s ?? "").trim()),
});

export async function setPriority(_prev: FormState, formData: FormData): Promise<FormState> {
  const a = await actionSession("issue:triage");
  if ("error" in a) return fail(a.error);
  const { user } = a.session;
  const parsed = parseInput(prioritySchema, formData);
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const on = d.on === "1";
  if (on) {
    if (d.commitment.length < 10 || d.commitment.length > 280) return fail("validation", { fields: { commitment: d.commitment.length < 10 ? "note_short" : "commitment_long" } });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.targetDate) || Number.isNaN(Date.parse(d.targetDate))) return fail("validation", { fields: { targetDate: "date_invalid" } });
  }

  const res = await db().transaction(async (tx) => {
    const issue = await lockIssue(tx, d.issueId);
    if (!issue) return "not_found" as const;
    if (on && !issue.mpPriority) {
      const [c] = await tx.select({ n: sql<number>`count(*)::int` }).from(issues).where(and(eq(issues.mpPriority, true), sql`${issues.status} not in ('resolved','rejected')`));
      if ((c?.n ?? 0) >= MAX_PRIORITIES) return "priority_limit" as const;
    }
    await tx
      .update(issues)
      .set({ mpPriority: on, mpCommitment: on ? d.commitment : null, mpTargetDate: on ? d.targetDate : null, updatedAt: new Date() })
      .where(eq(issues.id, issue.id));
    await addUpdate(tx, {
      issueId: issue.id,
      actorId: user.id,
      actorRole: "office",
      actorLabel: user.officeTitle ?? "MP Office",
      kind: "priority",
      body: on ? d.commitment : null,
      meta: { on, targetDate: on ? d.targetDate : null },
    });
    await audit({ actorId: user.id, action: on ? "issue.priority_on" : "issue.priority_off", targetType: "issue", targetId: issue.id }, tx);
    return issue;
  });
  if (typeof res === "string") return fail(res);
  if (on) await notify([res.authorId], "priority", { issueId: res.id });
  revalidatePath(`/issues/${res.id}`);
  return ok();
}

// ───────────── MP office: extension decisions ─────────────

const extensionSchema = z.object({ issueId: uuid, decision: z.enum(["approve", "decline"]), note: z.string().optional().transform((s) => (s ?? "").trim().slice(0, LIMITS.noteMax)) });

export async function decideExtension(_prev: FormState, formData: FormData): Promise<FormState> {
  const a = await actionSession("issue:triage");
  if ("error" in a) return fail(a.error);
  const { user } = a.session;
  const parsed = parseInput(extensionSchema, formData);
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;

  const res = await db().transaction(async (tx) => {
    const issue = await lockIssue(tx, d.issueId);
    if (!issue || !issue.stakeholderId) return "not_found" as const;
    const [last] = await tx
      .select()
      .from(issueUpdates)
      .where(and(eq(issueUpdates.issueId, issue.id), sql`${issueUpdates.kind} in ('extension_requested','extension_approved','extension_declined')`))
      .orderBy(desc(issueUpdates.createdAt))
      .limit(1);
    if (!last || last.kind !== "extension_requested") return "no_pending_request" as const;
    const requested = typeof last.meta?.requestedDueAt === "string" ? new Date(last.meta.requestedDueAt) : null;
    if (d.decision === "approve" && (!requested || Number.isNaN(requested.getTime()))) return "no_pending_request" as const;
    if (d.decision === "approve") await tx.update(issues).set({ dueAt: requested, updatedAt: new Date() }).where(eq(issues.id, issue.id));
    await addUpdate(tx, {
      issueId: issue.id,
      actorId: user.id,
      actorRole: "office",
      actorLabel: user.officeTitle ?? "MP Office",
      kind: d.decision === "approve" ? "extension_approved" : "extension_declined",
      body: d.note,
      stakeholderId: issue.stakeholderId,
      meta: { requestedDueAt: last.meta?.requestedDueAt ?? null },
    });
    await audit({ actorId: user.id, action: `issue.extension_${d.decision}`, targetType: "issue", targetId: issue.id }, tx);
    return issue;
  });
  if (typeof res === "string") return fail(res);
  await notify(await authorityUserIds(res.stakeholderId!), "extension_decision", { issueId: res.id, data: { decision: d.decision } });
  revalidatePath(`/issues/${res.id}`);
  return ok();
}

// ───────────── Authority officer: work on assigned issues ─────────────

const authoritySchema = z.object({
  issueId: uuid,
  action: z.enum(["acknowledge", "progress", "resolve", "refer_back", "request_extension"]),
  note: z.string().optional().transform((s) => (s ?? "").trim()),
  newDueDate: z.string().optional().transform((s) => (s ?? "").trim()),
  mediaIds: z
    .string()
    .optional()
    .transform((s) => (s ? s.split(",").filter(Boolean) : []))
    .pipe(z.array(uuid).max(LIMITS.maxProofImages, "too_many_images")),
});

export async function authorityWork(_prev: FormState, formData: FormData): Promise<FormState> {
  const a = await actionSession("issue:work");
  if ("error" in a) return fail(a.error);
  const { user } = a.session;
  if (!user.stakeholderId) return fail("forbidden");
  const lim = await rateLimit(`authority-work:${user.id}`, 60, 3600);
  if (!lim.ok) return fail("rate_limited", { retryAfterSec: lim.retryAfterSec });

  const parsed = parseInput(authoritySchema, formData);
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const action = d.action as AuthorityAction;

  if (d.note.length > LIMITS.noteMax) return fail("validation", { fields: { note: "note_long" } });
  if ((action === "progress" || action === "refer_back" || action === "request_extension") && d.note.length < 10) {
    return fail("validation", { fields: { note: "note_short" } });
  }
  if (action === "resolve" && d.mediaIds.length < 1) return fail("validation", { fields: { media: "proof_required" } });
  let requestedDue: Date | null = null;
  if (action === "request_extension") {
    requestedDue = /^\d{4}-\d{2}-\d{2}$/.test(d.newDueDate) ? new Date(`${d.newDueDate}T11:00:00Z`) : null;
    if (!requestedDue || Number.isNaN(requestedDue.getTime()) || requestedDue.getTime() <= Date.now()) {
      return fail("validation", { fields: { newDueDate: "date_invalid" } });
    }
  }

  let result;
  try {
    result = await db().transaction(async (tx) => {
      const issue = await lockIssue(tx, d.issueId);
      if (!issue || issue.stakeholderId !== user.stakeholderId) return "not_found" as const;
      const { allowed, to } = authorityTransition(action, issue.status as never);
      if (!allowed) return "invalid_transition" as const;

      const mediaIds = action === "resolve" || action === "progress" ? await claimMedia(tx, user.id, d.mediaIds) : [];
      const [st] = await tx.select({ nameEn: stakeholders.nameEn }).from(stakeholders).where(eq(stakeholders.id, user.stakeholderId!));
      const label = st?.nameEn ?? "Authority";
      const patch: Partial<typeof issues.$inferInsert> = { updatedAt: new Date() };
      if (to) patch.status = to;
      if (action === "acknowledge") patch.acknowledgedAt = new Date();
      if (action === "resolve") patch.resolvedAt = new Date();
      if (action === "refer_back") {
        patch.stakeholderId = null;
        patch.dueAt = null;
        patch.acknowledgedAt = null;
      }
      if (action === "resolve" || action === "refer_back" || action === "acknowledge") patch.statusNote = d.note || null;
      await tx.update(issues).set(patch).where(eq(issues.id, issue.id));

      await addUpdate(tx, {
        issueId: issue.id,
        actorId: user.id,
        actorRole: "authority",
        actorLabel: label,
        kind:
          action === "resolve" ? "proof" : action === "request_extension" ? "extension_requested" : action === "refer_back" ? "referred_back" : action === "progress" ? "note" : "status",
        fromStatus: issue.status,
        toStatus: to ?? issue.status,
        body: d.note,
        stakeholderId: issue.stakeholderId,
        meta: requestedDue ? { requestedDueAt: requestedDue.toISOString() } : undefined,
        mediaIds,
      });
      await audit({ actorId: user.id, action: `authority.${action}`, targetType: "issue", targetId: issue.id }, tx);
      return { issue, to };
    });
  } catch (e) {
    if (e instanceof Error && e.message === "media_invalid") return fail("media_invalid");
    throw e;
  }

  if (typeof result === "string") return fail(result);
  const { issue, to } = result;
  if (action === "refer_back" || action === "request_extension") {
    await notify(await officeUserIds(), action === "refer_back" ? "referred_back" : "extension_requested", { issueId: issue.id });
  }
  if (action === "acknowledge" || action === "resolve" || action === "progress") {
    const audience = action === "resolve" ? new Set([issue.authorId, ...(await voterIds(issue.id))]) : new Set([issue.authorId]);
    await notify([...audience], action === "progress" ? "official_note" : "status", { issueId: issue.id, data: { to: to ?? issue.status } });
  }
  revalidatePath(`/issues/${issue.id}`);
  revalidatePath("/authority");
  return ok();
}

// ───────────── Stakeholders (offices that fix issues) ─────────────

export async function saveStakeholder(_prev: FormState, formData: FormData): Promise<FormState> {
  const a = await actionSession("stakeholder:manage");
  if ("error" in a) return fail(a.error);
  const parsed = parseInput(stakeholderSchema, formData);
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const values = { nameEn: d.nameEn, nameBn: d.nameBn, kind: d.kind, upazilaId: d.upazilaId, phone: d.phone, email: d.email };
  try {
    if (d.id) {
      await db().update(stakeholders).set(values).where(eq(stakeholders.id, d.id));
      await audit({ actorId: a.session.user.id, action: "stakeholder.update", targetType: "stakeholder", targetId: d.id });
    } else {
      const [row] = await db().insert(stakeholders).values(values).returning({ id: stakeholders.id });
      await audit({ actorId: a.session.user.id, action: "stakeholder.create", targetType: "stakeholder", targetId: row!.id });
    }
  } catch (e) {
    if (isUniqueViolation(e)) return fail("stakeholder_exists", { fields: { nameEn: "stakeholder_exists" } });
    throw e;
  }
  invalidateReference();
  revalidatePath("/office/stakeholders");
  return ok();
}

export async function setStakeholderActive(id: string, active: boolean): Promise<ActionResult> {
  const a = await actionSession("stakeholder:manage");
  if ("error" in a) return fail(a.error);
  if (!uuid.safeParse(id).success) return fail("not_found");
  await db().update(stakeholders).set({ active }).where(eq(stakeholders.id, id));
  await audit({ actorId: a.session.user.id, action: active ? "stakeholder.activate" : "stakeholder.deactivate", targetType: "stakeholder", targetId: id });
  invalidateReference();
  revalidatePath("/office/stakeholders");
  return ok();
}

const appointSchema = z.object({
  email: emailSchema,
  stakeholderId: uuid,
  officeTitle: z.string().optional().transform((s) => (s ?? "").trim().slice(0, 80) || null),
});

/** Make an existing, registered citizen an authority officer for one office. Takes effect after they sign in again. */
export async function appointAuthority(_prev: FormState, formData: FormData): Promise<FormState> {
  const a = await actionSession("authority:appoint");
  if ("error" in a) return fail(a.error);
  const parsed = parseInput(appointSchema, formData);
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;

  const [target] = await db().select().from(users).where(eq(users.email, d.email));
  if (!target || target.status !== "active") return fail("user_not_found", { fields: { email: "user_not_found" } });
  if (target.role !== "citizen" && !(target.role === "authority")) return fail("user_not_citizen", { fields: { email: "user_not_citizen" } });
  const [s] = await db().select().from(stakeholders).where(and(eq(stakeholders.id, d.stakeholderId), eq(stakeholders.active, true)));
  if (!s) return fail("validation", { fields: { stakeholderId: "stakeholder_required" } });

  await db().update(users).set({ role: "authority", stakeholderId: s.id, officeTitle: d.officeTitle, totpSecretEnc: null, totpEnabledAt: null, recoveryCodes: null }).where(eq(users.id, target.id));
  await destroyAllSessions(target.id);
  await audit({ actorId: a.session.user.id, action: "authority.appoint", targetType: "user", targetId: target.id, meta: { stakeholderId: s.id } });
  await notify([target.id], "role_granted", { data: { role: "authority", office: s.nameEn } });
  revalidatePath("/office/stakeholders");
  return ok();
}

export async function revokeAuthority(userId: string): Promise<ActionResult> {
  const a = await actionSession("authority:appoint");
  if ("error" in a) return fail(a.error);
  if (!uuid.safeParse(userId).success) return fail("not_found");
  const [row] = await db()
    .update(users)
    .set({ role: "citizen", stakeholderId: null, officeTitle: null, totpSecretEnc: null, totpEnabledAt: null, recoveryCodes: null })
    .where(and(eq(users.id, userId), eq(users.role, "authority")))
    .returning({ id: users.id });
  if (!row) return fail("not_found");
  await destroyAllSessions(userId);
  await audit({ actorId: a.session.user.id, action: "authority.revoke", targetType: "user", targetId: userId });
  revalidatePath("/office/stakeholders");
  return ok();
}
