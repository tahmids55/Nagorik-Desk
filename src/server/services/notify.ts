import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db, type Tx } from "../db/client";
import { notifications, users, votes } from "../db/schema";

export type NotifKind =
  | "comment"
  | "status"
  | "assigned"
  | "official_note"
  | "extension_requested"
  | "extension_decision"
  | "referred_back"
  | "reopened"
  | "hidden"
  | "restored"
  | "role_granted"
  | "priority";

type Payload = Record<string, string | number | null>;

/**
 * Stores the event name and parameters only. The text is rendered in the
 * reader's own language when it is displayed.
 */
export async function notify(
  userIds: string[],
  kind: NotifKind,
  opts: { issueId?: string; data?: Payload; exceptUserId?: string },
  tx?: Tx,
): Promise<void> {
  const targets = [...new Set(userIds)].filter((id) => id !== opts.exceptUserId);
  if (targets.length === 0) return;
  await (tx ?? db())
    .insert(notifications)
    .values(targets.map((userId) => ({ userId, kind, issueId: opts.issueId, data: opts.data })));
}

export async function officeUserIds(tx?: Tx): Promise<string[]> {
  const rows = await (tx ?? db())
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "office"), eq(users.status, "active")));
  return rows.map((r) => r.id);
}

export async function authorityUserIds(stakeholderId: string, tx?: Tx): Promise<string[]> {
  const rows = await (tx ?? db())
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "authority"), eq(users.stakeholderId, stakeholderId), eq(users.status, "active")));
  return rows.map((r) => r.id);
}

/** People who supported or opposed the issue (they asked, implicitly, to hear about progress). */
export async function voterIds(issueId: string, onlyUpvoters = true, tx?: Tx): Promise<string[]> {
  const rows = await (tx ?? db())
    .select({ id: votes.userId })
    .from(votes)
    .where(onlyUpvoters ? and(eq(votes.issueId, issueId), eq(votes.value, 1)) : eq(votes.issueId, issueId))
    .limit(5000);
  return rows.map((r) => r.id);
}

export async function unreadCount(userId: string): Promise<number> {
  const [row] = await db()
    .select({ n: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), sql`${notifications.readAt} is null`));
  return row?.n ?? 0;
}

