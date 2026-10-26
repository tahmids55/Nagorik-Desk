import { AlertTriangle, CheckCircle2, Hammer, Inbox, Timer } from "lucide-react";
import Link from "next/link";
import { IssueTable } from "@/components/staff/IssueTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { getT } from "@/i18n/server";
import { formatNumber } from "@/i18n/translate";
import { overdueIssues, pendingExtensions, triageQueue } from "@/server/queries/staff";
import { getOverview } from "@/server/queries/stats";

export const dynamic = "force-dynamic";

export default async function OfficeDashboard() {
  const [{ t, lang }, o, queue, overdue, ext] = await Promise.all([getT(), getOverview(), triageQueue(8), overdueIssues(8), pendingExtensions()]);
  const n = (v: number) => formatNumber(v, lang);
  const kpi = (icon: typeof Inbox, label: string, value: string, href: string, tone = "text-brand") => {
    const Icon = icon;
    return (
      <Link href={href} className="card rounded-[4px] shadow-none p-4 hover:border-brand/50">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted">
          <Icon className={`h-4 w-4 ${tone}`} aria-hidden="true" />
          {label}
        </div>
        <p className="mt-2 text-3xl font-medium tabular-nums">{value}</p>
      </Link>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">{t("office_dashboard")}</h1>
        <p className="mt-1 text-sm text-muted">{t("office_dashboard_sub")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpi(Inbox, t("kpi_needs_triage"), n(o.open), "/office/issues?status=unassigned")}
        {kpi(Hammer, t("kpi_in_progress"), n(o.inProgress), "/office/issues?status=assigned")}
        {kpi(AlertTriangle, t("stat_overdue"), n(o.overdue), "/office/issues?overdue=1", "text-danger")}
        {kpi(CheckCircle2, t("kpi_solved_30"), n(o.resolvedLast30), "/office/issues?status=resolved", "text-ok")}
      </div>
      <p className="-mt-5 flex items-center gap-2 text-xs text-faint">
        <Timer className="h-3.5 w-3.5" aria-hidden="true" />
        {t("median_note", { n: o.medianDaysToResolve === null ? "–" : n(o.medianDaysToResolve) })}
      </p>

      {ext.length > 0 && (
        <section aria-labelledby="ext-h">
          <h2 id="ext-h" className="mb-3 text-lg font-semibold">{t("extension_requests")}</h2>
          <IssueTable rows={ext} />
        </section>
      )}

      <section aria-labelledby="queue-h">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="queue-h" className="text-lg font-semibold">{t("triage_queue")}</h2>
          <Link href="/office/issues?status=unassigned" className="link text-sm font-semibold">{t("view_all")}</Link>
        </div>
        {queue.length === 0 ? <EmptyState icon={Inbox} title={t("empty_queue_title")} body={t("empty_queue_body")} /> : <IssueTable rows={queue} />}
      </section>

      <section aria-labelledby="overdue-h">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="overdue-h" className="text-lg font-semibold">{t("overdue_list")}</h2>
          <Link href="/office/issues?overdue=1" className="link text-sm font-semibold">{t("view_all")}</Link>
        </div>
        {overdue.length === 0 ? <EmptyState icon={CheckCircle2} title={t("empty_overdue_title")} body={t("empty_overdue_body")} /> : <IssueTable rows={overdue} />}
      </section>
    </div>
  );
}
