"use client";

import { Bell, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { TimeAgo } from "@/components/ui/TimeAgo";
import { useDismiss } from "@/hooks/useDismiss";
import { useI18n } from "@/i18n/client";
import { formatNumber } from "@/i18n/translate";
import { cn } from "@/lib/cn";
import { notificationText, type NotificationItem } from "@/lib/notifications";
import { fetchUserNotifications, markNotificationsRead, markSingleNotificationRead } from "@/server/actions/profile";

export function NotificationBell({ initialUnread = 0 }: { initialUnread?: number }) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnread);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  // A server refresh (navigation, new data) may bring a newer count.
  useEffect(() => setUnreadCount(initialUnread), [initialUnread]);

  useDismiss(isOpen, () => setIsOpen(false), containerRef);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchUserNotifications();
      setItems(res.items);
      setUnreadCount(res.unreadCount);
    } catch {
      /* keep what we have */
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleOpen = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) void loadNotifications();
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || markingAll) return;
    setMarkingAll(true);
    try {
      await markNotificationsRead();
      const now = new Date().toISOString();
      setItems((prev) => prev.map((item) => ({ ...item, readAt: item.readAt ?? now })));
      setUnreadCount(0);
    } catch {
      /* ignore */
    } finally {
      setMarkingAll(false);
    }
  };

  const handleItemClick = (item: NotificationItem) => {
    if (!item.readAt) {
      startTransition(async () => {
        await markSingleNotificationRead(item.id);
      });
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, readAt: new Date().toISOString() } : i)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    setIsOpen(false);
    if (item.issueId) router.push(`/issues/${item.issueId}`);
  };

  const badge = unreadCount > 99 ? "99+" : formatNumber(unreadCount, lang);

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={toggleOpen}
        aria-label={unreadCount > 0 ? `${t("notifications")} (${badge})` : t("notifications")}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={cn(
          "btn-ghost btn-sm relative flex min-h-[40px] min-w-[40px] items-center justify-center rounded-[3px] !px-2.5 transition-colors sm:min-h-[34px] sm:min-w-0",
          isOpen && "bg-neutral-fill text-ink",
        )}
      >
        <Bell className="h-[19px] w-[19px]" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] animate-pop-in items-center justify-center rounded-[2px] bg-brand px-1 text-[10px] font-medium text-[var(--btn-primary-text)]" aria-hidden="true">
            {badge}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label={t("notifications")}
          className="fixed inset-x-2 top-[calc(3.5rem+env(safe-area-inset-top)+0.25rem)] z-50 mt-1 w-auto max-w-[calc(100vw-1rem)] origin-top-right animate-pop-in overflow-hidden rounded-[4px] border border-line bg-surface shadow-popover sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[390px]"
        >
          <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">{t("notifications")}</h2>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="inline-flex min-h-[32px] items-center gap-1 text-xs font-medium text-brand hover:underline disabled:opacity-50"
              >
                {markingAll ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : <Check className="h-3 w-3" aria-hidden="true" />}
                <span>{t("mark_all_read")}</span>
              </button>
            )}
          </div>

          <div className="scroll-thin max-h-[calc(100dvh-11rem)] divide-y divide-line/60 overflow-y-auto overscroll-contain sm:max-h-[380px]">
            {loading && items.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-muted" role="status" aria-label={t("loading")}>
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              </div>
            ) : items.length === 0 ? (
              <div className="p-6 text-center text-muted">
                <Bell className="mx-auto h-7 w-7 opacity-30" aria-hidden="true" />
                <p className="mt-2 text-xs font-medium text-ink">{t("empty_notifications_title")}</p>
                <p className="mt-1 text-[11px] text-muted">{t("empty_notifications_body")}</p>
              </div>
            ) : (
              items.map((item) => {
                const isUnread = !item.readAt;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleItemClick(item)}
                    className={cn(
                      "flex w-full items-start gap-3 p-3.5 text-left transition-colors hover:bg-neutral-fill/40 focus-visible:bg-neutral-fill/40 focus-visible:outline-none",
                      isUnread && "bg-brand-tint/25",
                    )}
                  >
                    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", isUnread ? "bg-brand" : "bg-transparent")} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-[13.5px] leading-snug text-ink", isUnread ? "font-semibold" : "font-normal")}>
                        {notificationText(t, item.kind, item.data)}
                      </span>
                      {item.issueTitle && (
                        <span className="mt-0.5 block truncate text-xs text-muted" data-ugc>
                          {item.issueTitle}
                        </span>
                      )}
                      <TimeAgo date={item.createdAt} className="mt-1 block text-[11px] text-muted" />
                    </span>
                    {isUnread && <span className="sr-only">{t("unread")}</span>}
                  </button>
                );
              })
            )}
          </div>

          <div className="border-t border-line bg-neutral-fill/20 px-4 py-2.5 text-center">
            <Link href="/notifications" onClick={() => setIsOpen(false)} className="inline-block py-1 text-xs font-semibold text-brand hover:underline">
              {t("see_all_notifications")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
