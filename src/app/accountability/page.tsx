import { AlertTriangle, CheckCircle2, Clock3, FileText, Hammer, Star, Timer } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusChip } from "@/components/ui/StatusChip";
import { getT } from "@/i18n/server";
import { formatNumber } from "@/i18n/translate";
import { formatDate, formatDateTime } from "@/lib/format";
import { areaName, getAreas, getCategories } from "@/server/queries/reference";
import { byCategory, byStakeholder, byUpazila, getOverview, monthlyTrend, priorities, recentlyResolved } from "@/server/queries/stats";
import type { IssueStatus } from "@/lib/constants";

export const metadata: Metadata = { title: "Accountability", description: "Public scorecard: how many problems were reported, who is fixing them, and how fast." };
export const dynamic = "force-dynamic";

function Kpi({ icon: Icon, label, value, tone = "default" }: { icon: typeof Clock3; label: string; value: string; tone?: "default" | "ok" | "danger" }) {
  return (
    <div className="card rounded-[4px] shadow-none p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted">
        <Icon className={`h-4 w-4 ${tone === "ok" ? "text-ok" : tone === "danger" ? "text-danger" : "text-brand"}`} aria-hidden="true" />
        {label}
      </div>
      <p className={`mt-2 text-3xl font-medium tabular-nums ${tone === "ok" ? "text-ok" : tone === "danger" ? "text-danger" : ""}`}>{value}</p>
    </div>
  );
}

function Card({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="card rounded-[4px] shadow-none p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

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
  const monthLabel = (m: string) => new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-GB", { month: "short", timeZone: "UTC" }).format(new Date(`${m}-01T00:00:00Z`));
  const maxTrend = Math.max(1, ...trend.flatMap((x) => [x.reported, x.resolved]));
  const aName = (id: string) => areaName(areas.find((a) => a.id === id), lang);
  const cName = (id: string) => {
    const c = cats.find((x) => x.id === id);
    return c ? (lang === "bn" ? c.nameBn : c.nameEn) : id;
  };

  return (
    <div className="mx-auto max-w-[1100px] space-y-5 px-3 py-6 sm:px-4">
      <header>
        <h1 className="text-2xl font-semibold sm:text-3xl">{t("nav_accountability")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">{t("accountability_intro")}</p>
        <p className="mt-1 text-xs text-faint">{t("last_updated", { time: formatDateTime(overview.updatedAt, lang) })}</p>
      </header>

      {overview.total === 0 ? (
        <EmptyState icon={FileText} title={t("empty_scorecard_title")} body={t("empty_scorecard_body")} action={<Link href="/new" className="btn-primary rounded-[3px] font-medium">{t("report_first_issue")}</Link>} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Kpi icon={FileText} label={t("stat_reported")} value={n(overview.total)} />
            <Kpi icon={Hammer} label={t("stat_in_progress")} value={n(overview.inProgress)} />
            <Kpi icon={CheckCircle2} label={t("stat_solved")} value={n(overview.resolved)} tone="ok" />
            <Kpi icon={AlertTriangle} label={t("stat_overdue")} value={n(overview.overdue)} tone={overview.overdue > 0 ? "danger" : "default"} />
            <Kpi icon={Timer} label={t("stat_median_days")} value={overview.medianDaysToResolve === null ? "–" : n(overview.medianDaysToResolve)} />
          </div>

          {prios.length > 0 && (
            <Card title={t("mp_commitments")} hint={t("mp_commitments_hint")}>
              <ul className="divide-y divide-line">
                {prios.map((p) => (
                  <li key={p.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <Link href={`/issues/${p.id}`} className="font-semibold hover:text-brand" data-ugc>
                        <Star className="mr-1.5 inline h-4 w-4 text-brand" fill="currentColor" aria-hidden="true" />
                        {p.title}
                      </Link>
                      <div className="flex items-center gap-2">
                        {p.pastTarget && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-danger">
                            <span className="h-[9px] w-[9px] rounded-[1px] bg-danger shrink-0" aria-hidden="true" />
                            {t("past_target")}
                          </span>
                        )}
                        <StatusChip status={p.status as IssueStatus} />
                      </div>
                    </div>
                    {p.commitment && <p className="mt-1 text-sm text-muted" data-ugc>{p.commitment}</p>}
                    <p className="mt-1 text-xs text-faint">
                      {aName(p.upazilaId)}
                      {p.targetDate && ` · ${t("target_date", { date: formatDate(p.targetDate, lang) })}`}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            <Card title={t("trend_title")} hint={t("trend_hint")}>
              <div className="flex h-40 items-end gap-2" role="img" aria-label={t("trend_title")}>
                {trend.map((m) => (
                  <div key={m.month} className="flex flex-1 flex-col items-center gap-1.5">
                    <div className="flex h-32 w-full items-end justify-center gap-1">
                      <div className="w-1/2 max-w-[22px] rounded-t-[2px] bg-brand" style={{ height: `${(m.reported / maxTrend) * 100}%`, minHeight: m.reported ? 3 : 0 }} title={`${t("stat_reported")}: ${m.reported}`} />
                      <div className="w-1/2 max-w-[22px] rounded-t-[2px] bg-ok" style={{ height: `${(m.resolved / maxTrend) * 100}%`, minHeight: m.resolved ? 3 : 0 }} title={`${t("stat_solved")}: ${m.resolved}`} />
                    </div>
                    <span className="text-[11px] text-muted">{monthLabel(m.month)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-4 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[1px] bg-brand" aria-hidden="true" />{t("stat_reported")}</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[1px] bg-ok" aria-hidden="true" />{t("stat_solved")}</span>
              </div>
            </Card>

            <Card title={t("by_area")}>
              <ul className="space-y-3">
                {upz.map((r) => (
                  <li key={r.key}>
                    <div className="mb-1 flex justify-between text-sm">
                      <Link href={`/?area=${r.key}`} className="font-semibold hover:text-brand">{aName(r.key)}</Link>
                      <span className="text-muted tabular-nums">{t("solved_of", { a: n(r.resolved), b: n(r.total) })}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-[2px] bg-raised" role="progressbar" aria-valuenow={r.total ? Math.round((r.resolved / r.total) * 100) : 0} aria-valuemin={0} aria-valuemax={100} aria-label={aName(r.key)}>
                      <div className="h-full rounded-[2px] bg-ok" style={{ width: `${r.total ? (r.resolved / r.total) * 100 : 0}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Card title={t("by_category")}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
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
                      <td className="py-2.5"><Link href={`/?category=${r.key}`} className="hover:text-brand">{cName(r.key)}</Link></td>
                      <td className="py-2.5 text-right tabular-nums">{n(r.total)}</td>
                      <td className="py-2.5 text-right tabular-nums text-ok">{n(r.resolved)}</td>
                      <td className={`py-2.5 text-right tabular-nums ${r.overdue ? "text-danger" : "text-muted"}`}>{n(r.overdue)}</td>
                      <td className="py-2.5 text-right tabular-nums">{pct(r.resolved, r.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title={t("office_performance")} hint={t("office_performance_hint")}>
            {offices.length === 0 ? (
              <p className="text-sm text-muted">{t("no_offices_yet")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
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
                        <td className="py-2.5 font-semibold">{lang === "bn" && o.nameBn ? o.nameBn : o.nameEn}</td>
                        <td className="py-2.5 text-right tabular-nums">{n(o.assigned)}</td>
                        <td className="py-2.5 text-right tabular-nums text-ok">{n(o.resolved)}</td>
                        <td className={`py-2.5 text-right tabular-nums ${o.overdue ? "text-danger" : "text-muted"}`}>{n(o.overdue)}</td>
                        <td className="py-2.5 text-right tabular-nums">{pct(o.acknowledgedInTime, o.assigned)}</td>
                        <td className="py-2.5 text-right tabular-nums">{o.medianDays === null ? "–" : n(o.medianDays)}</td>
                        <td className="py-2.5 text-right tabular-nums">{n(o.reopened)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {fixed.length > 0 && (
            <Card title={t("recently_fixed")}>
              <ul className="divide-y divide-line">
                {fixed.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <Link href={`/issues/${f.id}`} className="min-w-0 flex-1 truncate font-semibold hover:text-brand" data-ugc>
                      <CheckCircle2 className="mr-1.5 inline h-4 w-4 text-ok" aria-hidden="true" />
                      {f.title}
                    </Link>
                    <span className="shrink-0 text-xs text-muted">{aName(f.upazilaId)} · {t("fixed_in_days", { n: n(f.days) })}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
      <p className="text-left text-xs text-faint">{t("stats_computed_note")}</p>
    </div>
  );
}
