import { Bell } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { MarkRead } from "@/components/notifications/MarkRead";
import { EmptyState } from "@/components/ui/EmptyState";
import { TimeAgo } from "@/components/ui/TimeAgo";
import { getT } from "@/i18n/server";
import { cn } from "@/lib/cn";
import { notificationText } from "@/lib/notifications";
import { requireUser } from "@/server/auth/guards";
import { listNotifications } from "@/server/queries/notifications";

export const metadata: Metadata = { title: "Notifications", robots: { index: false } };

export default async function NotificationsPage() {
  const { user } = await requireUser("/notifications");
  const [{ t }, items] = await Promise.all([getT(), listNotifications(user.id, 60)]);
  const unread = items.filter((n) => !n.readAt).length;

  return (
    <div className="mx-auto max-w-[680px] px-3 py-5 sm:px-4 sm:py-6">
      <h1 className="mb-4 text-xl font-semibold sm:text-2xl">{t("notifications")}</h1>
      <MarkRead unread={unread} />
      {items.length === 0 ? (
        <EmptyState icon={Bell} title={t("empty_notifications_title")} body={t("empty_notifications_body")} />
      ) : (
        <ul className="card divide-y divide-line overflow-hidden rounded-[4px] shadow-none">
          {items.map((n) => {
            const inner = (
              <>
                <span className={cn("mt-1.5 h-[9px] w-[9px] shrink-0 rounded-[1px]", n.readAt ? "bg-transparent" : "bg-brand")} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-sm", !n.readAt && "font-semibold")}>{notificationText(t, n.kind, n.data)}</span>
                  {n.issueTitle && (
                    <span className="mt-0.5 block truncate text-xs text-muted" data-ugc>
                      {n.issueTitle}
                    </span>
                  )}
                  <TimeAgo date={n.createdAt} className="mt-0.5 block text-xs text-faint" />
                </span>
                {!n.readAt && <span className="sr-only">{t("unread")}</span>}
              </>
            );
            return (
              <li key={n.id}>
                {n.issueId ? (
                  <Link href={`/issues/${n.issueId}`} className="flex gap-3 px-4 py-3.5 hover:bg-raised">
                    {inner}
                  </Link>
                ) : (
                  <div className="flex gap-3 px-4 py-3.5">{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
