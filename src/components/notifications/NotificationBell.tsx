"use client";

import { Bell, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { TimeAgo } from "@/components/ui/TimeAgo";
import { useI18n } from "@/i18n/client";
import type { TKey } from "@/i18n/translate";
import { cn } from "@/lib/cn";
import {
  fetchUserNotifications,
  markNotificationsRead,
  markSingleNotificationRead,
  type NotificationItem,
} from "@/server/actions/profile";

export function NotificationBell({ initialUnread = 0 }: { initialUnread?: number }) {
  const { t } = useI18n();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnread);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [, startTransition] = useTransition();

  const containerRef = useRef<HTMLDivElement>(null);

  // Sync initialUnread when prop changes
  useEffect(() => {
    setUnreadCount(initialUnread);
  }, [initialUnread]);

  // Load notifications when opening
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchUserNotifications();
      setItems(res.items);
      setUnreadCount(res.unreadCount);
    } catch {
      // keep fallback
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleOpen = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) {
      loadNotifications();
    }
  };

  // Close on outside click or Esc
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || markingAll) return;
    setMarkingAll(true);
    try {
      await markNotificationsRead();
      setItems((prev) => prev.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
      setUnreadCount(0);
    } catch {
      // ignore
    } finally {
      setMarkingAll(false);
    }
  };

  const handleItemClick = (item: NotificationItem) => {
    if (!item.readAt) {
      startTransition(async () => {
        await markSingleNotificationRead(item.id);
      });
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, readAt: new Date().toISOString() } : i))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    setIsOpen(false);
    if (item.issueId) {
      router.push(`/issues/${item.issueId}`);
    }
  };

  /** Formats event sentences into localized user language */
  const formatNotificationText = (kind: string, data: Record<string, string | number | null> | null): string => {
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

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={toggleOpen}
        aria-label={t("notifications")}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={cn(
          "btn-ghost btn-sm relative !px-2.5 rounded-[3px] transition-colors",
          isOpen && "bg-neutral-fill text-ink"
        )}
      >
        <Bell className="h-[19px] w-[19px]" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-[2px] bg-brand px-1 text-[10px] font-medium text-[var(--btn-primary-text)] animate-in fade-in">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Floating Facebook-Style Notification Popover */}
      {isOpen && (
        <div
          role="dialog"
          aria-label={t("notifications")}
          className="fixed inset-x-2 top-14 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full mt-1 sm:mt-2 w-auto sm:w-[390px] max-w-[calc(100vw-1rem)] z-50 rounded-[4px] border border-line bg-surface shadow-popover overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between border-b border-line px-4 py-3 bg-surface">
            <h2 className="text-sm font-semibold text-ink">{t("notifications")}</h2>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline disabled:opacity-50"
              >
                {markingAll ? (
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                ) : (
                  <Check className="h-3 w-3" aria-hidden="true" />
                )}
                <span>{t("mark_all_read")}</span>
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-[380px] overflow-y-auto scroll-thin divide-y divide-line/60">
            {loading && items.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-muted">
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
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={cn(
                      "flex items-start gap-3 p-3.5 text-left transition-colors cursor-pointer hover:bg-neutral-fill/40",
                      isUnread && "bg-brand-tint/25"
                    )}
                  >
                    {/* Unread indicator dot */}
                    <span
                      className={cn(
                        "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                        isUnread ? "bg-brand" : "bg-transparent"
                      )}
                      aria-hidden="true"
                    />

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-[13.5px] leading-snug text-ink",
                          isUnread ? "font-semibold" : "font-normal"
                        )}
                      >
                        {formatNotificationText(item.kind, item.data)}
                      </p>

                      {item.issueTitle && (
                        <p className="mt-0.5 truncate text-xs text-muted" data-ugc>
                          {item.issueTitle}
                        </p>
                      )}

                      <TimeAgo
                        date={item.createdAt}
                        className="mt-1 block text-[11px] text-muted"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Link to full notifications archive */}
          <div className="border-t border-line bg-neutral-fill/20 px-4 py-2.5 text-center">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-brand hover:underline"
            >
              {t("see_all_notifications")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
