import { Bell } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { MarkRead } from "@/components/notifications/MarkRead";
import { EmptyState } from "@/components/ui/EmptyState";
import { TimeAgo } from "@/components/ui/TimeAgo";
import { getT } from "@/i18n/server";
import type { TKey } from "@/i18n/translate";
import { cn } from "@/lib/cn";
import { requireUser } from "@/server/auth/guards";
import { db } from "@/server/db/client";
import { issues, notifications } from "@/server/db/schema";

export const metadata: Metadata = { title: "Notifications", robots: { index: false } };

export default async function NotificationsPage() {
  const { user } = await requireUser("/notifications");
  const { t } = await getT();
  const rows = await db()
    .select({ n: notifications, title: issues.title })
    .from(notifications)
    .leftJoin(issues, eq(issues.id, notifications.issueId))
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(60);

  /** Events are stored as name + parameters; the sentence is built here, in the reader's language. */
  const text = (kind: string, data: Record<string, string | number | null> | null): string => {
    const d = data ?? {};
    switch (kind) {
      case "comment":
        return t("n_comment", { name: String(d.name ?? "") });
      case "status":
        if (d.new) return t("n_new_report");
        if (d.to === "confirmed") return t("n_confirmed");
        return t("n_status", { status: t(`status_${String(d.to)}` as TKey) });
      case "assigned":
        return t("n_assigned");
      case "official_note":
        return t("n_official_note");
      case "extension_requested":
        return t("n_extension_requested");
      case "extension_decision":
        return d.decision === "approve" ? t("n_extension_approved") : t("n_extension_declined");
      case "referred_back":
        return t("n_referred_back");
      case "reopened":
        return t("n_reopened");
      case "hidden":
        return t("n_hidden");
      case "restored":
        return t("n_restored");
      case "role_granted":
        return t("n_role_granted", { role: t(`role_${String(d.role)}` as TKey) });
      case "priority":
        return t("n_priority");
      default:
        return t("n_generic");
    }
  };

  const unread = rows.filter((r) => !r.n.readAt).length;

  return (
    <div className="mx-auto max-w-[680px] px-3 py-6 sm:px-4">
      <h1 className="mb-4 text-2xl font-semibold">{t("notifications")}</h1>
      <MarkRead unread={unread} />
      {rows.length === 0 ? (
        <EmptyState icon={Bell} title={t("empty_notifications_title")} body={t("empty_notifications_body")} />
      ) : (
        <ul className="card rounded-[4px] shadow-none divide-y divide-line overflow-hidden">
          {rows.map(({ n, title }) => {
            const inner = (
              <>
                <span className={cn("mt-1.5 h-[9px] w-[9px] shrink-0 rounded-[1px]", n.readAt ? "bg-transparent" : "bg-brand")} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-sm", !n.readAt && "font-semibold")}>{text(n.kind, n.data)}</span>
                  {title && (
                    <span className="mt-0.5 block truncate text-xs text-muted" data-ugc>
                      {title}
                    </span>
                  )}
                  <TimeAgo date={n.createdAt.toISOString()} className="mt-0.5 block text-xs text-faint" />
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
