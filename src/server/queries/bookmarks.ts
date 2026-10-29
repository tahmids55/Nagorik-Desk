import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../db/client";
import { bookmarks } from "../db/schema";

/** Which of these issues has the user saved? Used to fill the `saved` flag on a page of cards. */
export async function getSavedIssueIds(userId: string, issueIds: string[]): Promise<Set<string>> {
  if (issueIds.length === 0) return new Set();
  const rows = await db()
    .select({ issueId: bookmarks.issueId })
    .from(bookmarks)
    .where(and(eq(bookmarks.userId, userId), inArray(bookmarks.issueId, issueIds)));
  return new Set(rows.map((r) => r.issueId));
}

/** The user's saved issue ids, most recently saved first. */
export async function listSavedIssueIds(userId: string, limit = 200): Promise<string[]> {
  const rows = await db()
    .select({ issueId: bookmarks.issueId })
    .from(bookmarks)
    .where(eq(bookmarks.userId, userId))
    .orderBy(desc(bookmarks.createdAt))
    .limit(Math.max(1, Math.min(limit, 500)));
  return rows.map((r) => r.issueId);
}
