import { Inbox } from "lucide-react";
import Link from "next/link";
import { IssueTable } from "@/components/staff/IssueTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { getT } from "@/i18n/server";
import type { TKey } from "@/i18n/translate";
import { areaName, getAreas, getStakeholders } from "@/server/queries/reference";
import { staffIssues } from "@/server/queries/staff";

export const dynamic = "force-dynamic";
export const metadata = { title: "Issues" };

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
const STATUS_OPTS = ["unassigned", "open", "under_review", "assigned", "in_progress", "resolved", "rejected"] as const;

export default async function OfficeIssues({ searchParams }: { searchParams: SP }) {
  const [{ t, lang }, areas, stakeholders] = await Promise.all([getT(), getAreas(), getStakeholders({ activeOnly: true })]);
  const f = {
    status: one(searchParams.status),
    upazila: one(searchParams.upazila),
    stakeholder: one(searchParams.stakeholder),
    q: one(searchParams.q),
    overdue: one(searchParams.overdue) === "1",
    page: Number(one(searchParams.page)) || 1,
  };
  const { rows, hasMore } = await staffIssues(f);

  const qs = (page: number) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ status: f.status, upazila: f.upazila, stakeholder: f.stakeholder, q: f.q, overdue: f.overdue ? "1" : undefined, page: String(page) })) if (v) p.set(k, v);
    return `/office/issues?${p}`;
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">{t("office_issues")}</h1>

      <form className="card rounded-[4px] shadow-none grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_170px_170px_190px_auto]" role="search">
        <input name="q" defaultValue={f.q} className="input rounded-[3px]" placeholder={t("search_placeholder")} aria-label={t("search_placeholder")} maxLength={80} />
        <select name="status" defaultValue={f.status ?? ""} className="input rounded-[3px]" aria-label={t("filter_status")}>
          <option value="">{t("filter_all")}</option>
          {STATUS_OPTS.map((s) => (
            <option key={s} value={s}>
              {s === "unassigned" ? t("kpi_needs_triage") : t(`status_${s}` as TKey)}
            </option>
          ))}
        </select>
        <select name="upazila" defaultValue={f.upazila ?? ""} className="input rounded-[3px]" aria-label={t("filter_area")}>
          <option value="">{t("all_areas")}</option>
          {areas.filter((a) => a.kind === "upazila").map((a) => (
            <option key={a.id} value={a.id}>
              {areaName(a, lang)}
            </option>
          ))}
        </select>
        <select name="stakeholder" defaultValue={f.stakeholder ?? ""} className="input rounded-[3px]" aria-label={t("responsible_office")}>
          <option value="">{t("all_offices")}</option>
          <option value="none">{t("no_office_assigned")}</option>
          {stakeholders.map((s) => (
            <option key={s.id} value={s.id}>
              {lang === "bn" && s.nameBn ? s.nameBn : s.nameEn}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" name="overdue" value="1" defaultChecked={f.overdue} className="accent-brand" />
            {t("stat_overdue")}
          </label>
          <button className="btn-secondary btn-sm rounded-[3px] font-medium" type="submit">
            {t("apply")}
          </button>
        </div>
      </form>

      {rows.length === 0 ? (
        <EmptyState icon={Inbox} title={t("empty_filtered_title")} body={t("empty_filtered_body")} action={<Link href="/office/issues" className="btn-secondary rounded-[3px] font-medium">{t("clear_filters")}</Link>} />
      ) : (
        <IssueTable rows={rows} />
      )}

      {(f.page > 1 || hasMore) && (
        <nav className="flex items-center justify-between" aria-label={t("pagination")}>
          {f.page > 1 ? <Link href={qs(f.page - 1)} className="btn-secondary btn-sm rounded-[3px] font-medium">{t("previous")}</Link> : <span />}
          {hasMore && <Link href={qs(f.page + 1)} className="btn-secondary btn-sm rounded-[3px] font-medium">{t("next")}</Link>}
        </nav>
      )}
    </div>
  );
}
