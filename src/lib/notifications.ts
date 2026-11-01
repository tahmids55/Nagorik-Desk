import type { TFn, TKey } from "@/i18n/translate";

export type NotificationData = Record<string, string | number | null> | null;

/** Shape shared by the bell popover and the notifications page. */
export type NotificationItem = {
  id: string;
  kind: string;
  data: NotificationData;
  issueId: string | null;
  issueTitle: string | null;
  createdAt: string;
  readAt: string | null;
};

/**
 * Notifications are stored as an event name plus parameters; the sentence is built
 * at display time, in the reader's language.
 */
export function notificationText(t: TFn, kind: string, data: NotificationData): string {
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
}
