import { AlertTriangle, CheckCircle2, Clock3, Download, FileText, Hammer, Star, Timer } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { TopContributors } from "@/components/stats/TopContributors";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusChip } from "@/components/ui/StatusChip";
import { getT } from "@/i18n/server";
import { formatNumber } from "@/i18n/translate";
import { cn } from "@/lib/cn";
import type { IssueStatus } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/format";
import { areaName, getAreas, getCategories } from "@/server/queries/reference";
import { byCategory, byStakeholder, byUpazila, getOverview, monthlyTrend, priorities, recentlyResolved } from "@/server/queries/stats";

export const metadata: Metadata = { title: "Accountability", description: "Public scorecard: how many problems were reported, who is fixing them, and how fast." };
export const dynamic = "force-dynamic";

function Kpi({ icon: Icon, label, value, tone = "default" }: { icon: typeof Clock3; label: string; value: string; tone?: "default" | "ok" | "danger" }) {
  return (
    <div className="card h-full rounded-[4px] p-3.5 shadow-none sm:p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted">
        <Icon className={cn("h-4 w-4 shrink-0", tone === "ok" ? "text-ok" : tone === "danger" ? "text-danger" : "text-brand")} aria-hidden="true" />
        <span className="truncate">{label}</span>
      </div>
      <p className={cn("mt-2 text-2xl font-medium tabular-nums sm:text-3xl", tone === "ok" && "text-ok", tone === "danger" && "text-danger")}>{value}</p>
    </div>
  );
}

function Card({ title, hint, id, children }: { title: string; hint?: string; id?: string; children: ReactNode }) {
  return (
    <section id={id} className="card scroll-mt-20 rounded-[4px] p-4 shadow-none sm:p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Label above, number below; `dt` first so the description list stays valid. */
function MiniStat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex flex-col-reverse rounded-[3px] bg-raised px-2 py-1.5">
      <dt className="text-[11px] leading-tight text-muted">{label}</dt>
      <dd className={cn("text-base font-medium tabular-nums", tone)}>{value}</dd>
    </div>
  );
}

const Bar = ({ value, label }: { value: number; label: string }) => (
  <div className="h-1.5 overflow-hidden rounded-[2px] bg-neutral-fill" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
    <div className="h-full rounded-[2px] bg-ok" style={{ width: `${value}%` }} />
  </div>
);

export default async function AccountabilityPage() {
  const [{ t, lang }, areas, cats, overview, upz, catRows, offices, trend, prios, fixed] = await Promise.all([
    getT(),
    getAreas(),
    getCategories(),
    getOverview(),
    byUpazila(),
    byCategory(),
    byStakeholder(),
    monthlyTrend(),
    priorities(),
    recentlyResolved(),
  ]);
  const n = (v: number) => formatNumber(v, lang);
  const pct = (a: number, b: number) => (b === 0 ? "–" : `${n(Math.round((a / b) * 100))}%`);
  const ratio = (a: number, b: number) => (b === 0 ? 0 : (a / b) * 100);
  const monthLabel = (m: string) => new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-GB", { month: "short", timeZone: "UTC" }).format(new Date(`${m}-01T00:00:00Z`));
  const maxTrend = Math.max(1, ...trend.flatMap((x) => [x.reported, x.resolved]));
  const aName = (id: string) => areaName(areas.find((a) => a.id === id), lang);
  const cName = (id: string) => {
    const c = cats.find((x) => x.id === id);
    return c ? (lang === "bn" ? c.nameBn : c.nameEn) : id;
  };
  const oName = (o: { nameEn: string; nameBn: string | null }) => (lang === "bn" && o.nameBn ? o.nameBn : o.nameEn);

  return (
    <div className="mx-auto max-w-[1100px] space-y-4 px-3 py-5 sm:space-y-5 sm:px-4 sm:py-6">
      <header>
        <h1 className="text-2xl font-semibold sm:text-3xl">{t("nav_accountability")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">{t("accountability_intro")}</p>
        <p className="mt-1 text-xs text-faint">{t("last_updated", { time: formatDateTime(overview.updatedAt, lang) })}</p>
      </header>

      {overview.total === 0 ? (
        <EmptyState icon={FileText} title={t("empty_scorecard_title")} body={t("empty_scorecard_body")} action={<Link href="/new" className="btn-primary rounded-[3px] font-medium">{t("report_first_issue")}</Link>} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-5">
            <Kpi icon={FileText} label={t("stat_reported")} value={n(overview.total)} />
            <Kpi icon={Hammer} label={t("stat_in_progress")} value={n(overview.inProgress)} />
            <Kpi icon={CheckCircle2} label={t("stat_solved")} value={n(overview.resolved)} tone="ok" />
            <Kpi icon={AlertTriangle} label={t("stat_overdue")} value={n(overview.overdue)} tone={overview.overdue > 0 ? "danger" : "default"} />
            <div className="col-span-2 md:col-span-1">
              <Kpi icon={Timer} label={t("stat_median_days")} value={overview.medianDaysToResolve === null ? "–" : n(overview.medianDaysToResolve)} />
            </div>
          </div>

          {prios.length > 0 && (
            <Card title={t("mp_commitments")} hint={t("mp_commitments_hint")}>
              <ul className="divide-y divide-line">
                {prios.map((p) => (
                  <li key={p.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <Link href={`/issues/${p.id}`} className="min-w-0 font-semibold hover:text-brand" data-ugc>
                        <Star className="mr-1.5 inline h-4 w-4 text-brand" fill="currentColor" aria-hidden="true" />
                        {p.title}
                      </Link>
                      <div className="flex items-center gap-2">
                        {p.pastTarget && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-danger">
                            <span className="h-[9px] w-[9px] shrink-0 rounded-[1px] bg-danger" aria-hidden="true" />
                            {t("past_target")}
                          </span>
                        )}
                        <StatusChip status={p.status as IssueStatus} />
                      </div>
                    </div>
                    {p.commitment && (
                      <p className="mt-1 text-sm text-muted" data-ugc>
                        {p.commitment}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-faint">
                      {aName(p.upazilaId)}
                      {p.targetDate && ` · ${t("target_date", { date: formatDate(p.targetDate, lang) })}`}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
            <Card title={t("trend_title")} hint={t("trend_hint")}>
              <div className="flex h-36 items-end gap-2 sm:h-40" role="img" aria-label={`${t("trend_title")}: ${trend.map((m) => `${monthLabel(m.month)} ${t("stat_reported")} ${n(m.reported)}, ${t("stat_solved")} ${n(m.resolved)}`).join("; ")}`}>
                {trend.map((m) => (
                  <div key={m.month} className="flex flex-1 flex-col items-center gap-1.5">
                    <div className="flex h-28 w-full items-end justify-center gap-1 sm:h-32">
                      <div className="w-1/2 max-w-[22px] rounded-t-[2px] bg-brand" style={{ height: `${(m.reported / maxTrend) * 100}%`, minHeight: m.reported ? 3 : 0 }} title={`${t("stat_reported")}: ${n(m.reported)}`} />
                      <div className="w-1/2 max-w-[22px] rounded-t-[2px] bg-ok" style={{ height: `${(m.resolved / maxTrend) * 100}%`, minHeight: m.resolved ? 3 : 0 }} title={`${t("stat_solved")}: ${n(m.resolved)}`} />
                    </div>
                    <span className="text-[11px] text-muted">{monthLabel(m.month)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-4 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-[1px] bg-brand" aria-hidden="true" />
                  {t("stat_reported")}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-[1px] bg-ok" aria-hidden="true" />
                  {t("stat_solved")}
                </span>
              </div>
            </Card>

            <Card title={t("by_area")}>
              <ul className="space-y-3">
                {upz.map((r) => (
                  <li key={r.key}>
                    <div className="mb-1 flex justify-between gap-3 text-sm">
                      <Link href={`/?area=${r.key}`} className="font-semibold hover:text-brand">
                        {aName(r.key)}
                      </Link>
                      <span className="shrink-0 tabular-nums text-muted">{t("solved_of", { a: n(r.resolved), b: n(r.total) })}</span>
                    </div>
                    <Bar value={ratio(r.resolved, r.total)} label={aName(r.key)} />
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Card title={t("by_category")}>
            {/* Phones: one compact row per category */}
            <ul className="divide-y divide-line sm:hidden">
              {catRows.map((r) => (
                <li key={r.key} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <Link href={`/?category=${r.key}`} className="min-w-0 truncate text-sm font-semibold hover:text-brand">
                      {cName(r.key)}
                    </Link>
                    <span className="shrink-0 text-sm font-medium tabular-nums">{pct(r.resolved, r.total)}</span>
                  </div>
                  <p className="mb-1.5 mt-0.5 text-xs text-muted">
                    {t("stat_reported")} {n(r.total)} · <span className="text-ok">{t("stat_solved")} {n(r.resolved)}</span>
                    {r.overdue > 0 && (
                      <span className="text-danger">
                        {" "}
                        · {t("stat_overdue")} {n(r.overdue)}
                      </span>
                    )}
                  </p>
                  <Bar value={ratio(r.resolved, r.total)} label={cName(r.key)} />
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-muted">
                    <th className="pb-2 font-semibold">{t("category")}</th>
                    <th className="pb-2 text-right font-semibold">{t("stat_reported")}</th>
                    <th className="pb-2 text-right font-semibold">{t("stat_solved")}</th>
                    <th className="pb-2 text-right font-semibold">{t("stat_overdue")}</th>
                    <th className="pb-2 text-right font-semibold">{t("solve_rate")}</th>
                  </tr>
                </thead>
                <tbody>
                  {catRows.map((r) => (
                    <tr key={r.key} className="border-b border-line/60 last:border-0">
                      <td className="py-2.5">
                        <Link href={`/?category=${r.key}`} className="hover:text-brand">
                          {cName(r.key)}
                        </Link>
                      </td>
                      <td className="py-2.5 text-right tabular-nums">{n(r.total)}</td>
                      <td className="py-2.5 text-right tabular-nums text-ok">{n(r.resolved)}</td>
                      <td className={cn("py-2.5 text-right tabular-nums", r.overdue ? "text-danger" : "text-muted")}>{n(r.overdue)}</td>
                      <td className="py-2.5 text-right tabular-nums">{pct(r.resolved, r.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title={t("office_performance")} hint={t("office_performance_hint")} id="offices">
            {offices.length === 0 ? (
              <p className="text-sm text-muted">{t("no_offices_yet")}</p>
            ) : (
              <>
                {/* Phones: one card per office */}
                <ul className="space-y-2.5 md:hidden">
                  {offices.map((o) => (
                    <li key={o.id} className="rounded-[3px] border border-line p-3">
                      <Link href={`/offices/${o.id}`} className="block text-sm font-semibold leading-snug hover:text-brand">
                        {oName(o)}
                      </Link>
                      <dl className="mt-2 grid grid-cols-3 gap-1.5">
                        <MiniStat label={t("assigned")} value={n(o.assigned)} />
                        <MiniStat label={t("stat_solved")} value={n(o.resolved)} tone="text-ok" />
                        <MiniStat label={t("stat_overdue")} value={n(o.overdue)} tone={o.overdue ? "text-danger" : undefined} />
                        <MiniStat label={t("ack_48h")} value={pct(o.acknowledgedInTime, o.assigned)} />
                        <MiniStat label={t("median_days_short")} value={o.medianDays === null ? "–" : n(o.medianDays)} />
                        <MiniStat label={t("reopened")} value={n(o.reopened)} />
                      </dl>
                    </li>
                  ))}
                </ul>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line text-left text-xs text-muted">
                        <th className="pb-2 font-semibold">{t("office")}</th>
                        <th className="pb-2 text-right font-semibold">{t("assigned")}</th>
                        <th className="pb-2 text-right font-semibold">{t("stat_solved")}</th>
                        <th className="pb-2 text-right font-semibold">{t("stat_overdue")}</th>
                        <th className="pb-2 text-right font-semibold">{t("ack_48h")}</th>
                        <th className="pb-2 text-right font-semibold">{t("median_days_short")}</th>
                        <th className="pb-2 text-right font-semibold">{t("reopened")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {offices.map((o) => (
                        <tr key={o.id} className="border-b border-line/60 last:border-0">
                          <td className="py-2.5 pr-3 font-semibold">
                            <Link href={`/offices/${o.id}`} className="hover:text-brand hover:underline">
                              {oName(o)}
                            </Link>
                          </td>
                          <td className="py-2.5 text-right tabular-nums">{n(o.assigned)}</td>
                          <td className="py-2.5 text-right tabular-nums text-ok">{n(o.resolved)}</td>
                          <td className={cn("py-2.5 text-right tabular-nums", o.overdue ? "text-danger" : "text-muted")}>{n(o.overdue)}</td>
                          <td className="py-2.5 text-right tabular-nums">{pct(o.acknowledgedInTime, o.assigned)}</td>
                          <td className="py-2.5 text-right tabular-nums">{o.medianDays === null ? "–" : n(o.medianDays)}</td>
                          <td className="py-2.5 text-right tabular-nums">{n(o.reopened)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>

          <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
            {fixed.length > 0 && (
              <Card title={t("recently_fixed")}>
                <ul className="divide-y divide-line">
                  {fixed.map((f) => (
                    <li key={f.id} className="py-2.5 first:pt-0 last:pb-0">
                      <Link href={`/issues/${f.id}`} className="line-clamp-2 text-sm font-semibold hover:text-brand" data-ugc>
                        <CheckCircle2 className="mr-1.5 inline h-4 w-4 text-ok" aria-hidden="true" />
                        {f.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted">
                        {aName(f.upazilaId)} · {t("fixed_in_days", { n: n(f.days) })}
                      </p>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            <Card title={t("top_contributors")} hint={t("contributors_hint")} id="contributors">
              <TopContributors limit={8} />
            </Card>
          </div>
        </>
      )}

      <section className="flex flex-col gap-3 rounded-[4px] border border-dashed border-line-strong p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">{t("download_csv")}</p>
          <p className="mt-0.5 text-xs text-muted">{t("open_data_hint")}</p>
        </div>
        <a href="/api/export/issues" download className="btn-secondary btn-sm shrink-0 self-start rounded-[3px] sm:self-auto">
          <Download className="h-4 w-4" aria-hidden="true" />
          CSV
        </a>
      </section>
      <p className="text-left text-xs text-faint">{t("stats_computed_note")}</p>
    </div>
  );
}
