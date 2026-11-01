import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { getT } from "@/i18n/server";
import { formatNumber } from "@/i18n/translate";
import { cn } from "@/lib/cn";
import { getOverview } from "@/server/queries/stats";

/** Phones and tablets: the constituency figures from the desktop sidebar, as one tappable row. */
export async function PulseStrip({ className }: { className?: string }) {
  const [{ t, lang }, o] = await Promise.all([getT(), getOverview()]);
  if (o.total === 0) return null;
  const n = (v: number) => formatNumber(v, lang);
  const stats: [string, string, string?][] = [
    [n(o.total), t("stat_reported")],
    [n(o.resolved), t("stat_solved"), "text-ok"],
    [o.medianDaysToResolve === null ? "–" : n(o.medianDaysToResolve), t("median_days_short")],
  ];
  return (
    <Link
      href="/accountability"
      className={cn("card flex items-stretch overflow-hidden transition-colors hover:border-brand/50 active:bg-neutral-fill/40", className)}
      aria-label={`${t("constituency_pulse")}: ${stats.map(([v, l]) => `${l} ${v}`).join(", ")}. ${t("see_scorecard")}`}
    >
      <span className="grid flex-1 grid-cols-3 divide-x divide-line">
        {stats.map(([value, label, tone]) => (
          <span key={label} className="min-w-0 px-3 py-2.5">
            <span className={cn("block text-lg font-medium leading-none tabular-nums", tone)}>{value}</span>
            <span className="mt-1 block truncate text-[11px] leading-tight text-muted">{label}</span>
          </span>
        ))}
      </span>
      <span className="flex items-center border-l border-line px-2.5 text-brand" aria-hidden="true">
        <ChevronRight className="h-5 w-5" />
      </span>
    </Link>
  );
}
