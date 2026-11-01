import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "../db/client";
import { issues, notifications } from "../db/schema";
import type { NotificationData, NotificationItem } from "@/lib/notifications";

/** Newest first, with the title of the related report (if any). */
export async function listNotifications(userId: string, limit = 30): Promise<NotificationItem[]> {
  const rows = await db()
    .select({ n: notifications, title: issues.title })
    .from(notifications)
    .leftJoin(issues, eq(issues.id, notifications.issueId))
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(Math.max(1, Math.min(limit, 100)));
  return rows.map(({ n, title }) => ({
    id: n.id,
    kind: n.kind,
    data: (n.data ?? null) as NotificationData,
    issueId: n.issueId,
    issueTitle: title,
    createdAt: n.createdAt.toISOString(),
    readAt: n.readAt ? n.readAt.toISOString() : null,
  }));
}
