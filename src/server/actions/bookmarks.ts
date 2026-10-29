"use server";

import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { bookmarks, issues } from "../db/schema";
import { actionSession } from "../auth/guards";
import { rateLimit } from "../security/rate-limit";
import { fail, ok, type ActionResult } from "@/lib/action";

/** Save an issue for later, or remove it from the saved list if it is already there. */
export async function toggleBookmark(issueId: string): Promise<ActionResult<{ saved: boolean }>> {
  if (!z.string().uuid().safeParse(issueId).success) return fail("not_found");
  const a = await actionSession();
  if ("error" in a) return fail(a.error);
  const { user } = a.session;

  const limit = await rateLimit(`bookmark:${user.id}`, 60, 60);
  if (!limit.ok) return fail("rate_limited", { retryAfterSec: limit.retryAfterSec });

  const saved = await db().transaction(async (tx) => {
    const [existing] = await tx
      .select({ issueId: bookmarks.issueId })
      .from(bookmarks)
      .where(and(eq(bookmarks.userId, user.id), eq(bookmarks.issueId, issueId)));

    // Removing is always allowed, even if the issue has since been hidden.
    if (existing) {
      await tx.delete(bookmarks).where(and(eq(bookmarks.userId, user.id), eq(bookmarks.issueId, issueId)));
      return false;
    }

    const [issue] = await tx
      .select({ id: issues.id })
      .from(issues)
      .where(and(eq(issues.id, issueId), isNull(issues.hiddenAt)));
    if (!issue) return null;

    await tx.insert(bookmarks).values({ userId: user.id, issueId }).onConflictDoNothing();
    return true;
  });

  if (saved === null) return fail("not_found");
  return ok({ saved });
}
