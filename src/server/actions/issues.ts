"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "../db/client";
import { comments, flags, issueMedia, issues, votes } from "../db/schema";
import { actionSession } from "../auth/guards";
import { rateLimit } from "../security/rate-limit";
import { audit } from "../security/audit";
import { claimMedia } from "../services/media";
import { addUpdate } from "../services/timeline";
import { authorityUserIds, notify, officeUserIds } from "../services/notify";
import { findSimilar, getComments, type SimilarDTO } from "../queries/issues";
import { getAreas, getCategories } from "../queries/reference";
import { getSession } from "../auth/session";

import { fail, ok, type ActionResult } from "@/lib/action";
import type { CommentDTO } from "@/lib/types";
import { REOPEN_WINDOW_DAYS } from "@/lib/constants";
import { insideConstituency } from "@/lib/geo/boundary";
import { detectUpazila, nearestArea } from "@/lib/geo/areas";
import { addWorkingDays } from "@/lib/working-days";
import { commentSchema, flagSchema, issueSchema } from "@/lib/validation";
import { isUniqueViolation, parseInput } from "./_util";
import { z } from "zod";

export type FormState = ActionResult | null;

// ───────────── Create ─────────────

export async function createIssue(_prev: FormState, formData: FormData): Promise<FormState> {
  const a = await actionSession("issue:create");
  if ("error" in a) return fail(a.error);
  const { user } = a.session;

  const limit = await rateLimit(`issue:${user.id}`, 10, 86_400);
  if (!limit.ok) return fail("rate_limited", { retryAfterSec: limit.retryAfterSec });

  const parsed = parseInput(issueSchema, formData);
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;

  const [allAreas, cats] = await Promise.all([getAreas(), getCategories()]);
  if (!cats.some((c) => c.id === d.categoryId)) return fail("validation", { fields: { categoryId: "category_required" } });

  let upazila = allAreas.find((x) => x.id === d.upazilaId && x.kind === "upazila");
  if (!upazila) return fail("validation", { fields: { upazilaId: "area_required" } });

  let lat: number;
  let lng: number;
  let precise = false;
  let union = d.unionId ? allAreas.find((x) => x.id === d.unionId && x.kind === "union" && x.parentId === upazila!.id) : undefined;
  if (d.unionId && !union) return fail("validation", { fields: { unionId: "area_invalid" } });

  if (d.hasPin === "1" && d.lat !== undefined && d.lng !== undefined) {
    if (!insideConstituency(d.lat, d.lng)) return fail("outside_boundary", { fields: { location: "outside_boundary" } });
    lat = d.lat;
    lng = d.lng;
    precise = true;
    // The pin decides the area: detect the upazila, then the nearest union.
    const detected = detectUpazila(lat, lng);
    const detectedUpazila = detected ? allAreas.find((x) => x.id === detected && x.kind === "upazila") : undefined;
    if (detectedUpazila) upazila = detectedUpazila;
    union = nearestArea({ lat, lng }, allAreas.filter((x) => x.kind === "union" && x.parentId === upazila!.id)) ?? undefined;
  } else {
    const centre = union ?? upazila;
    lat = centre.lat;
    lng = centre.lng;
  }

  // Cheap double-submit guard.
  const dup = await db()
    .select({ id: issues.id })
    .from(issues)
    .where(and(eq(issues.authorId, user.id), eq(issues.title, d.title), sql`${issues.createdAt} > now() - interval '1 hour'`))
    .limit(1);
  if (dup.length) return fail("duplicate_post");

  let id: string;
  try {
    id = await db().transaction(async (tx) => {
      const mediaIds = await claimMedia(tx, user.id, d.mediaIds);
      const [row] = await tx
        .insert(issues)
        .values({
          authorId: user.id,
          title: d.title,
          body: d.body,
          categoryId: d.categoryId,
          upazilaId: upazila!.id,
          unionId: union?.id ?? null,
          lat,
          lng,
          precise,
          landmark: d.landmark,
          isUrgent: d.isUrgent,
          anonymous: d.anonymous,
        })
        .returning({ id: issues.id });
      if (mediaIds.length) {
        await tx.insert(issueMedia).values(mediaIds.map((mediaId, position) => ({ issueId: row!.id, mediaId, position })));
      }
      await audit({ actorId: user.id, action: "issue.create", targetType: "issue", targetId: row!.id }, tx);
      return row!.id;
    });
  } catch (e) {
    if (e instanceof Error && e.message === "media_invalid") return fail("media_invalid");
    throw e;
  }

  // Let the MP office know there is something new to triage.
  const staff = await officeUserIds();
  await notify(staff, "status", { issueId: id, data: { to: "open", new: 1 }, exceptUserId: user.id });

  redirect(`/issues/${id}`);
}

/** Possible duplicates shown in the composer before posting. */
export async function checkSimilar(input: { lat: number; lng: number; categoryId: string; title: string }): Promise<SimilarDTO[]> {
  const a = await actionSession("issue:create");
  if ("error" in a) return [];
  const parsed = z
    .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180), categoryId: z.string(), title: z.string().max(200) })
    .safeParse(input);
  if (!parsed.success) return [];
  const lim = await rateLimit(`similar:${a.session.user.id}`, 60, 600);
  if (!lim.ok) return [];
  return findSimilar(parsed.data);
}

// ───────────── Vote ─────────────

export type VoteResult = { upvotes: number; downvotes: number; score: number; myVote: -1 | 0 | 1 };

export async function castVote(issueId: string, value: 1 | -1): Promise<ActionResult<VoteResult>> {
  if (value !== 1 && value !== -1) return fail("invalid");
  if (!z.string().uuid().safeParse(issueId).success) return fail("not_found");
  const a = await actionSession("issue:vote");
  if ("error" in a) return fail(a.error);
  const { user } = a.session;

  if (process.env.REQUIRE_VERIFIED_TO_VOTE === "true" && !user.emailVerified) return fail("verification_required");

  const limit = await rateLimit(`vote:${user.id}`, 60, 60);
  if (!limit.ok) return fail("rate_limited", { retryAfterSec: limit.retryAfterSec });

  const result = await db().transaction(async (tx) => {
    // Lock the issue row so concurrent votes are counted one at a time.
    const [issue] = await tx
      .select({ authorId: issues.authorId, hiddenAt: issues.hiddenAt })
      .from(issues)
      .where(eq(issues.id, issueId))
      .for("update");
    if (!issue || issue.hiddenAt) return "not_found" as const;
    if (issue.authorId === user.id) return "own_issue" as const;

    const [existing] = await tx
      .select({ value: votes.value })
      .from(votes)
      .where(and(eq(votes.issueId, issueId), eq(votes.userId, user.id)));

    let myVote: -1 | 0 | 1;
    if (existing && existing.value === value) {
      await tx.delete(votes).where(and(eq(votes.issueId, issueId), eq(votes.userId, user.id)));
      myVote = 0;
    } else {
      await tx
        .insert(votes)
        .values({ issueId, userId: user.id, value })
        .onConflictDoUpdate({ target: [votes.issueId, votes.userId], set: { value, updatedAt: new Date() } });
      myVote = value;
    }

    const [counts] = await tx
      .update(issues)
      .set({
        upvotes: sql`(select count(*) from ${votes} where ${votes.issueId} = ${issueId} and ${votes.value} = 1)`,
        downvotes: sql`(select count(*) from ${votes} where ${votes.issueId} = ${issueId} and ${votes.value} = -1)`,
        score: sql`(select coalesce(sum(${votes.value}), 0) from ${votes} where ${votes.issueId} = ${issueId})`,
      })
      .where(eq(issues.id, issueId))
      .returning({ upvotes: issues.upvotes, downvotes: issues.downvotes, score: issues.score });
    return { ...counts!, myVote };
  });

  if (result === "not_found") return fail("not_found");
  if (result === "own_issue") return fail("own_issue");
  return ok(result);
}

// ───────────── Comments ─────────────

export async function addComment(_prev: FormState, formData: FormData): Promise<FormState> {
  const a = await actionSession("comment:create");
  if ("error" in a) return fail(a.error);
  const { user } = a.session;
  const limit = await rateLimit(`comment:${user.id}`, 20, 3600);
  if (!limit.ok) return fail("rate_limited", { retryAfterSec: limit.retryAfterSec });

  const parsed = parseInput(commentSchema, formData);
  if ("error" in parsed) return parsed.error;
  const { issueId, body } = parsed.data;

  const outcome = await db().transaction(async (tx) => {
    const [issue] = await tx
      .select({ authorId: issues.authorId, hiddenAt: issues.hiddenAt })
      .from(issues)
      .where(eq(issues.id, issueId))
      .for("update");
    if (!issue || issue.hiddenAt) return null;
    await tx.insert(comments).values({ issueId, authorId: user.id, body });
    await tx
      .update(issues)
      .set({ commentCount: sql`(select count(*) from ${comments} where ${comments.issueId} = ${issueId} and ${comments.hiddenAt} is null)` })
      .where(eq(issues.id, issueId));
    return issue;
  });
  if (!outcome) return fail("not_found");

  await notify([outcome.authorId], "comment", { issueId, data: { name: user.name } }, undefined);
  revalidatePath(`/issues/${issueId}`);
  return ok();
}

export async function deleteOwnComment(commentId: string): Promise<ActionResult> {
  const a = await actionSession("comment:create");
  if ("error" in a) return fail(a.error);
  if (!z.string().uuid().safeParse(commentId).success) return fail("not_found");
  const [c] = await db()
    .update(comments)
    .set({ hiddenAt: new Date() })
    .where(and(eq(comments.id, commentId), eq(comments.authorId, a.session.user.id), sql`${comments.hiddenAt} is null`))
    .returning({ issueId: comments.issueId });
  if (!c) return fail("not_found");
  await db()
    .update(issues)
    .set({ commentCount: sql`(select count(*) from ${comments} where ${comments.issueId} = ${c.issueId} and ${comments.hiddenAt} is null)` })
    .where(eq(issues.id, c.issueId));
  revalidatePath(`/issues/${c.issueId}`);
  return ok();
}

export async function fetchIssueComments(issueId: string): Promise<CommentDTO[]> {
  const session = await getSession().catch(() => null);
  return getComments(issueId, session?.user.id ?? null);
}

// ───────────── Flag ─────────────

export async function flagContent(_prev: FormState, formData: FormData): Promise<FormState> {
  const a = await actionSession("flag:create");
  if ("error" in a) return fail(a.error);
  const { user } = a.session;
  const limit = await rateLimit(`flag:${user.id}`, 20, 3600);
  if (!limit.ok) return fail("rate_limited", { retryAfterSec: limit.retryAfterSec });

  const parsed = parseInput(flagSchema, formData);
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;

  const exists =
    d.targetType === "issue"
      ? await db().select({ id: issues.id }).from(issues).where(eq(issues.id, d.targetId)).limit(1)
      : await db().select({ id: comments.id }).from(comments).where(eq(comments.id, d.targetId)).limit(1);
  if (!exists.length) return fail("not_found");

  try {
    await db().insert(flags).values({ targetType: d.targetType, targetId: d.targetId, reporterId: user.id, reason: d.reason, note: d.note });
  } catch (e) {
    if (isUniqueViolation(e)) return ok(); // already flagged: same outcome for the user
    throw e;
  }
  return ok();
}

// ───────────── Reporter follow-up after a fix ─────────────

export async function confirmFix(issueId: string): Promise<ActionResult> {
  const a = await actionSession();
  if ("error" in a) return fail(a.error);
  const { user } = a.session;
  const done = await db().transaction(async (tx) => {
    const [i] = await tx
      .update(issues)
      .set({ confirmedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(issues.id, issueId), eq(issues.authorId, user.id), eq(issues.status, "resolved"), sql`${issues.confirmedAt} is null`))
      .returning({ stakeholderId: issues.stakeholderId });
    if (!i) return null;
    await addUpdate(tx, { issueId, actorId: user.id, actorRole: user.role, actorLabel: "Reporter", kind: "note", meta: { confirmed: true } });
    return i;
  });
  if (!done) return fail("not_allowed");
  if (done.stakeholderId) await notify(await authorityUserIds(done.stakeholderId), "status", { issueId, data: { to: "confirmed" } });
  await notify(await officeUserIds(), "status", { issueId, data: { to: "confirmed" } });
  revalidatePath(`/issues/${issueId}`);
  return ok();
}

export async function stillAProblem(issueId: string, noteInput: string): Promise<ActionResult> {
  const a = await actionSession();
  if ("error" in a) return fail(a.error);
  const { user } = a.session;
  const note = noteInput.trim().slice(0, 600);
  if (note.length < 5) return fail("validation", { fields: { note: "note_short" } });

  const res = await db().transaction(async (tx) => {
    const [i] = await tx.select().from(issues).where(eq(issues.id, issueId)).for("update");
    if (!i || i.authorId !== user.id || i.status !== "resolved" || i.confirmedAt) return "not_allowed" as const;
    if (!i.resolvedAt || Date.now() - i.resolvedAt.getTime() > REOPEN_WINDOW_DAYS * 86_400_000) return "window_closed" as const;
    if (i.reopenCount >= 2) return "limit" as const;
    await tx
      .update(issues)
      .set({
        status: "assigned",
        resolvedAt: null,
        acknowledgedAt: null,
        dueAt: addWorkingDays(new Date(), 5),
        reopenCount: i.reopenCount + 1,
        updatedAt: new Date(),
      })
      .where(eq(issues.id, issueId));
    await addUpdate(tx, {
      issueId,
      actorId: user.id,
      actorRole: user.role,
      actorLabel: "Reporter",
      kind: "reopened",
      fromStatus: "resolved",
      toStatus: "assigned",
      body: note,
      stakeholderId: i.stakeholderId,
    });
    return i;
  });
  if (typeof res === "string") return fail(res);
  if (res.stakeholderId) await notify(await authorityUserIds(res.stakeholderId), "reopened", { issueId });
  await notify(await officeUserIds(), "reopened", { issueId });
  revalidatePath(`/issues/${issueId}`);
  return ok();
}

export async function deleteOwnIssue(issueId: string): Promise<ActionResult> {
  const a = await actionSession();
  if ("error" in a) return fail(a.error);
  const { user } = a.session;

  if (!z.string().uuid().safeParse(issueId).success) return fail("not_found");

  const [row] = await db()
    .update(issues)
    .set({ hiddenAt: new Date(), hiddenReason: "author_withdrawn", hiddenBy: user.id })
    .where(
      and(
        eq(issues.id, issueId),
        eq(issues.authorId, user.id),
        sql`${issues.status} in ('open', 'under_review')`,
        isNull(issues.hiddenAt),
      ),
    )
    .returning({ id: issues.id });

  if (!row) return fail("not_allowed");

  await audit({ actorId: user.id, action: "issue.withdraw", targetType: "issue", targetId: issueId });
  revalidatePath("/");
  revalidatePath("/map");
  revalidatePath(`/issues/${issueId}`);
  return ok();
}

