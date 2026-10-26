"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { comments, flags, issues, stakeholders, users } from "../db/schema";
import { actionSession } from "../auth/guards";
import { destroyAllSessions } from "../auth/session";
import { audit } from "../security/audit";
import { notify } from "../services/notify";
import { fail, ok, type ActionResult } from "@/lib/action";
import { ROLES } from "@/lib/constants";
import { parseInput } from "./_util";

export type FormState = ActionResult | null;
const uuid = z.string().uuid();

async function otherActiveAdmins(exceptId: string): Promise<number> {
  const [r] = await db()
    .select({ n: sql<number>`count(*)::int` })
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.status, "active"), ne(users.id, exceptId)));
  return r?.n ?? 0;
}

const roleSchema = z.object({
  userId: uuid,
  role: z.enum(ROLES),
  stakeholderId: z.string().uuid().optional().or(z.literal("")).transform((v) => v || null),
  officeTitle: z.string().optional().transform((s) => (s ?? "").trim().slice(0, 80) || null),
});

/** Grant or change a role. The person is signed out everywhere and must re-enrol two-step login for staff roles. */
export async function setUserRole(_prev: FormState, formData: FormData): Promise<FormState> {
  const a = await actionSession("users:manage");
  if ("error" in a) return fail(a.error);
  const admin = a.session.user;
  const parsed = parseInput(roleSchema, formData);
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;

  if (d.userId === admin.id) return fail("cannot_change_self");
  const [target] = await db().select().from(users).where(eq(users.id, d.userId));
  if (!target || target.status === "deleted") return fail("not_found");
  if (target.role === d.role && d.role !== "authority") return ok();

  if (d.role === "authority") {
    if (!d.stakeholderId) return fail("validation", { fields: { stakeholderId: "stakeholder_required" } });
    const [s] = await db().select({ id: stakeholders.id }).from(stakeholders).where(and(eq(stakeholders.id, d.stakeholderId), eq(stakeholders.active, true)));
    if (!s) return fail("validation", { fields: { stakeholderId: "stakeholder_required" } });
  }

  await db()
    .update(users)
    .set({
      role: d.role,
      stakeholderId: d.role === "authority" ? d.stakeholderId : null,
      officeTitle: d.role === "citizen" ? null : d.officeTitle,
      // Two-step login is re-enrolled whenever the role changes
      totpSecretEnc: null,
      totpEnabledAt: null,
      recoveryCodes: null,
    })
    .where(eq(users.id, d.userId));
  await destroyAllSessions(d.userId);
  await audit({ actorId: admin.id, action: "user.role_changed", targetType: "user", targetId: d.userId, meta: { from: target.role, to: d.role } });
  if (d.role !== "citizen") await notify([d.userId], "role_granted", { data: { role: d.role } });
  revalidatePath("/admin/users");
  return ok();
}

const statusSchema = z.object({
  userId: uuid,
  status: z.enum(["active", "suspended"]),
  reason: z.string().optional().transform((s) => (s ?? "").trim().slice(0, 300)),
});

export async function setUserStatus(_prev: FormState, formData: FormData): Promise<FormState> {
  const a = await actionSession("users:manage");
  if ("error" in a) return fail(a.error);
  const admin = a.session.user;
  const parsed = parseInput(statusSchema, formData);
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  if (d.userId === admin.id) return fail("cannot_change_self");
  if (d.status === "suspended" && d.reason.length < 5) return fail("validation", { fields: { reason: "note_short" } });

  const [target] = await db().select().from(users).where(eq(users.id, d.userId));
  if (!target || target.status === "deleted") return fail("not_found");
  if (d.status === "suspended" && target.role === "admin" && (await otherActiveAdmins(target.id)) < 1) return fail("last_admin");

  await db()
    .update(users)
    .set({ status: d.status, statusReason: d.status === "suspended" ? d.reason : null })
    .where(eq(users.id, d.userId));
  if (d.status === "suspended") await destroyAllSessions(d.userId);
  await audit({ actorId: admin.id, action: d.status === "suspended" ? "user.suspended" : "user.reactivated", targetType: "user", targetId: d.userId, meta: { reason: d.reason || null } });
  revalidatePath("/admin/users");
  return ok();
}

const flagDecisionSchema = z.object({
  flagId: uuid,
  decision: z.enum(["dismiss", "hide"]),
  reason: z.string().optional().transform((s) => (s ?? "").trim().slice(0, 300)),
});

/** Moderation decision on a flagged issue or comment. Only admins moderate; the MP office cannot hide content. */
export async function decideFlag(_prev: FormState, formData: FormData): Promise<FormState> {
  const a = await actionSession("moderate");
  if ("error" in a) return fail(a.error);
  const admin = a.session.user;
  const parsed = parseInput(flagDecisionSchema, formData);
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  if (d.decision === "hide" && d.reason.length < 5) return fail("validation", { fields: { reason: "note_short" } });

  const outcome = await db().transaction(async (tx) => {
    const [flag] = await tx.select().from(flags).where(eq(flags.id, d.flagId)).for("update");
    if (!flag || flag.status !== "open") return null;

    let authorId: string | null = null;
    let issueId: string | null = null;
    if (d.decision === "hide") {
      if (flag.targetType === "issue") {
        const [i] = await tx
          .update(issues)
          .set({ hiddenAt: new Date(), hiddenReason: d.reason, hiddenBy: admin.id })
          .where(eq(issues.id, flag.targetId))
          .returning({ authorId: issues.authorId });
        authorId = i?.authorId ?? null;
        issueId = flag.targetId;
      } else {
        const [c] = await tx
          .update(comments)
          .set({ hiddenAt: new Date() })
          .where(eq(comments.id, flag.targetId))
          .returning({ authorId: comments.authorId, issueId: comments.issueId });
        authorId = c?.authorId ?? null;
        issueId = c?.issueId ?? null;
        if (c) {
          await tx
            .update(issues)
            .set({ commentCount: sql`(select count(*) from ${comments} where ${comments.issueId} = ${c.issueId} and ${comments.hiddenAt} is null)` })
            .where(eq(issues.id, c.issueId));
        }
      }
    }
    // Resolve every open flag on the same target with the same decision
    await tx
      .update(flags)
      .set({ status: d.decision === "hide" ? "actioned" : "dismissed", resolvedBy: admin.id, resolvedAt: new Date() })
      .where(and(eq(flags.targetType, flag.targetType), eq(flags.targetId, flag.targetId), eq(flags.status, "open")));
    await audit({ actorId: admin.id, action: `moderation.${d.decision}`, targetType: flag.targetType, targetId: flag.targetId, meta: { reason: d.reason || null } }, tx);
    return { authorId, issueId };
  });
  if (!outcome) return fail("not_found");
  if (outcome.authorId && d.decision === "hide") {
    await notify([outcome.authorId], "hidden", { issueId: outcome.issueId ?? undefined });
  }
  revalidatePath("/admin/moderation");
  revalidatePath("/");
  return ok();
}

export async function restoreIssue(issueId: string): Promise<ActionResult> {
  const a = await actionSession("moderate");
  if ("error" in a) return fail(a.error);
  if (!uuid.safeParse(issueId).success) return fail("not_found");
  const [i] = await db()
    .update(issues)
    .set({ hiddenAt: null, hiddenReason: null, hiddenBy: null })
    .where(and(eq(issues.id, issueId), sql`${issues.hiddenAt} is not null`))
    .returning({ authorId: issues.authorId });
  if (!i) return fail("not_found");
  await audit({ actorId: a.session.user.id, action: "moderation.restore", targetType: "issue", targetId: issueId });
  await notify([i.authorId], "restored", { issueId });
  revalidatePath("/admin/moderation");
  revalidatePath("/");
  return ok();
}
