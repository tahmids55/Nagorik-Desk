import { Flame, Star } from "lucide-react";
import Link from "next/link";
import { StatusChip } from "@/components/ui/StatusChip";
import { TimeAgo } from "@/components/ui/TimeAgo";
import { getT } from "@/i18n/server";
import { formatNumber } from "@/i18n/translate";
import { formatDate } from "@/lib/format";
import type { IssueStatus } from "@/lib/constants";
import type { StaffRow } from "@/server/queries/staff";
import { areaName, getAreas, getCategories } from "@/server/queries/reference";

/** Compact list for staff portals. On phones every row becomes a card. */
export async function IssueTable({ rows, showOffice = true }: { rows: StaffRow[]; showOffice?: boolean }) {
  const [{ t, lang }, areas, cats] = await Promise.all([getT(), getAreas(), getCategories()]);
  const a = (id: string) => areaName(areas.find((x) => x.id === id), lang);
  const c = (id: string) => {
    const x = cats.find((y) => y.id === id);
    return x ? (lang === "bn" ? x.nameBn : x.nameEn) : id;
  };

  return (
    <ul className="card rounded-[4px] shadow-none divide-y divide-line overflow-hidden">
      {rows.map((r) => (
        <li key={r.id}>
          <Link href={`/issues/${r.id}`} className="grid gap-x-4 gap-y-1.5 px-4 py-3 hover:bg-raised md:grid-cols-[1fr_auto]">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[15px] font-semibold">
                {r.mpPriority && <Star className="h-4 w-4 shrink-0 text-brand" fill="currentColor" aria-label={t("mp_priority")} />}
                {r.isUrgent && <Flame className="h-4 w-4 shrink-0 text-danger" aria-label={t("urgent")} />}
                <span className="truncate" data-ugc>
                  {r.title}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-muted">
                PG-{String(r.seq).padStart(5, "0")} · {c(r.categoryId)} · {a(r.upazilaId)} · <TimeAgo date={r.createdAt} />
                {showOffice && r.stakeholderNameEn && <> · {lang === "bn" && r.stakeholderNameBn ? r.stakeholderNameBn : r.stakeholderNameEn}</>}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              {r.overdue && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-danger">
                  <span className="h-[9px] w-[9px] rounded-[1px] bg-danger shrink-0" aria-hidden="true" />
                  {t("overdue")}
                </span>
              )}
              {r.dueAt && (r.status === "assigned" || r.status === "in_progress") && !r.overdue && <span className="text-xs text-muted">{t("due_label", { date: formatDate(r.dueAt, lang) })}</span>}
              <span className="text-xs font-medium text-muted tabular-nums">{formatNumber(r.score, lang)}</span>
              <StatusChip status={r.status as IssueStatus} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
