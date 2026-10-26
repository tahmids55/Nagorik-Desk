"use client";

import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/cn";
import type { IssueStatus } from "@/lib/constants";
import type { TKey } from "@/i18n/translate";

const STATUS_CONFIG: Record<IssueStatus, { colorClass: string; key: TKey }> = {
  open: { colorClass: "bg-status-new", key: "status_open" },
  under_review: { colorClass: "bg-status-new", key: "status_under_review" },
  assigned: { colorClass: "bg-status-assigned", key: "status_assigned" },
  in_progress: { colorClass: "bg-status-inprogress", key: "status_in_progress" },
  resolved: { colorClass: "bg-status-done", key: "status_resolved" },
  rejected: { colorClass: "bg-status-urgent", key: "status_rejected" },
};

/**
 * Small markers (status dots, bullets, legend keys) are tiny squares (about 9px, 1px corner).
 * Meaning colours are used as a small square marker plus a text label, never as a big filled badge.
 * No icons inside and no pill ends.
 */
export function StatusChip({ status, className }: { status: IssueStatus; className?: string }) {
  const { t } = useI18n();
  const s = STATUS_CONFIG[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-ink", className)}>
      <span className={cn("h-[9px] w-[9px] shrink-0 rounded-[1px]", s.colorClass)} aria-hidden="true" />
      <span>{t(s.key)}</span>
    </span>
  );
}
