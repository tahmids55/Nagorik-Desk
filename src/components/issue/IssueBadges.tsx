"use client";

import { AlertTriangle, EyeOff, Flame, Navigation, Star } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { formatNumber } from "@/i18n/translate";
import { cn } from "@/lib/cn";
import { deadlineDays, distanceParts } from "@/lib/issue";
import type { FeedItem } from "@/server/queries/feed";

const chip = "inline-flex items-center gap-1 rounded-[3px] border px-2 py-0.5 text-xs font-normal";

/** Category, urgent, overdue, priority and moderation chips, in one consistent row. */
export function IssueBadges({ item, showPriority = false }: { item: FeedItem; showPriority?: boolean }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap gap-1.5">
      {item.distanceM !== undefined && (
        <span className={cn(chip, "border-brand/40 font-medium text-brand")}>
          <Navigation className="h-3 w-3" aria-hidden="true" />
          <DistanceLabel meters={item.distanceM} />
        </span>
      )}
      <span className={cn(chip, "border-line text-muted")}>{item.labels.category}</span>
      {item.isUrgent && (
        <span className={cn(chip, "border-danger/40 bg-danger/10 text-danger")}>
          <Flame className="h-3.5 w-3.5" aria-hidden="true" />
          {t("urgent")}
        </span>
      )}
      {item.overdue && (
        <span className={cn(chip, "border-danger/40 bg-danger/10 text-danger")}>
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          {t("overdue")}
        </span>
      )}
      {showPriority && item.mpPriority && (
        <span className={cn(chip, "border-brand/40 bg-brand-soft font-semibold text-brand")}>
          <Star className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true" />
          {t("mp_priority")}
        </span>
      )}
      {item.hidden && (
        <span className={cn(chip, "border-warn/40 bg-warn/10 text-warn")}>
          <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
          {t("hidden_by_moderators")}
        </span>
      )}
    </div>
  );
}

/** "Due in 3 days" / "Due today" / "Overdue by 2 days" while an office is working on the issue. */
export function DueLabel({ dueAt, status, className }: Pick<FeedItem, "dueAt" | "status"> & { className?: string }) {
  const { t, lang } = useI18n();
  const days = deadlineDays(dueAt, status);
  if (days === null) return null;
  return (
    <span className={cn("text-xs font-semibold", days < 0 ? "text-danger" : "text-muted", className)}>
      {days < 0 ? t("overdue_by_days", { n: formatNumber(-days, lang) }) : days === 0 ? t("due_today") : t("due_in_days", { n: formatNumber(days, lang) })}
    </span>
  );
}

/** "1.2 km away", shown when the feed is sorted by distance. */
export function DistanceLabel({ meters }: { meters: number }) {
  const { t, lang } = useI18n();
  const { value, unit } = distanceParts(meters);
  const distance = t(unit === "m" ? "unit_m" : "unit_km", { n: formatNumber(value, lang) });
  return <span className="whitespace-nowrap">{t("distance_away", { distance })}</span>;
}
