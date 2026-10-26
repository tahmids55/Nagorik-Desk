"use client";

import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/cn";
import { formatDateTime, timeAgo } from "@/lib/format";

export function TimeAgo({ date, className }: { date: string; className?: string }) {
  const { lang } = useI18n();
  return (
    <time dateTime={date} title={formatDateTime(date, lang)} className={cn("text-muted", className)} suppressHydrationWarning>
      {timeAgo(date, lang)}
    </time>
  );
}
