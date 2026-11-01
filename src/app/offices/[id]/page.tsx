import { AlertTriangle, ArrowLeft, Building2, CheckCircle2, Clock3, Hammer, Inbox, RotateCcw, Timer } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Feed } from "@/components/issue/Feed";
import { EmptyState } from "@/components/ui/EmptyState";
import { getT } from "@/i18n/server";
import { formatNumber, type TKey } from "@/i18n/translate";
import { cn } from "@/lib/cn";
import { getSession } from "@/server/auth/session";
import { loadFeed } from "@/server/queries/feed";
import { areaName, getAreas, getStakeholders } from "@/server/queries/reference";
import { stakeholderScore } from "@/server/queries/stats";

type Props = { params: { id: string }; searchParams: { status?: string } };

export const dynamic = "force-dynamic";

const TABS = [
  { value: "", key: "filter_all" },
  { value: "progress", key: "filter_progress" },
  { value: "overdue", key: "filter_overdue" },
  { value: "resolved", key: "filter_resolved" },
] as const satisfies readonly { value: string; key: TKey }[];

async function findOffice(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return (await getStakeholders()).find((s) => s.id === id) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [office, { t, lang }] = await Promise.all([findOffice(params.id), getT()]);
  if (!office) return { title: "Not found" };
  const name = lang === "bn" && office.nameBn ? office.nameBn : office.nameEn;
  return { title: name, description: `${t("office_scorecard")}: ${name}` };
}

export default async function OfficePage({ params, searchParams }: Props) {
  const [{ t, lang }, session, office, score, areas] = await Promise.all([getT(), getSession(), findOffice(params.id), stakeholderScore(params.id), getAreas()]);
  if (!office || !score) notFound();

  const status = TABS.find((x) => x.value === searchParams.status)?.value ?? "";
  const viewer = session ? { id: session.user.id, role: session.user.role } : null;
  const query = { stakeholderId: office.id, status: status || undefined, sort: "new" as const };
  const { items, hasMore } = await loadFeed(query, viewer, lang);

  const n = (v: number) => formatNumber(v, lang);
  const name = lang === "bn" && office.nameBn ? office.nameBn : office.nameEn;
  const coverage = office.upazilaId ? t("office_area_covered", { area: areaName(areas.find((a) => a.id === office.upazilaId), lang) }) : t("whole_constituency");
  const ackRate = score.assigned ? `${n(Math.round((score.acknowledgedInTime / score.assigned) * 100))}%` : "–";

  const stats: { icon: typeof Clock3; label: string; value: string; tone?: string }[] = [
    { icon: Inbox, label: t("assigned"), value: n(score.assigned) },
    { icon: CheckCircle2, label: t("stat_solved"), value: n(score.resolved), tone: "text-ok" },
    { icon: AlertTriangle, label: t("stat_overdue"), value: n(score.overdue), tone: score.overdue ? "text-danger" : undefined },
    { icon: Hammer, label: t("ack_48h"), value: ackRate },
    { icon: Timer, label: t("median_days_short"), value: score.medianDays === null ? "–" : n(score.medianDays) },
    { icon: RotateCcw, label: t("reopened"), value: n(score.reopened) },
  ];

  return (
    <div className="mx-auto max-w-[860px] space-y-4 px-3 py-5 sm:px-4 sm:py-6">
      <Link href="/accountability#offices" className="inline-flex min-h-[32px] items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("nav_accountability")}
      </Link>

      <section className="card rounded-[4px] p-4 shadow-none sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[3px] bg-brand-soft text-brand">
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("office_scorecard")}</p>
            <h1 className="mt-0.5 text-xl font-semibold leading-snug sm:text-2xl">{name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
              <span>{t(`kind_${office.kind}` as TKey)}</span>
              <span aria-hidden="true">·</span>
              <span>{coverage}</span>
              {!office.active && <span className="rounded-[2px] border border-line px-1.5 py-0.5 text-xs">{t("inactive")}</span>}
            </p>
          </div>
        </div>
        {!office.active && <p className="mt-3 rounded-[3px] border border-line bg-raised px-3 py-2 text-sm text-muted">{t("office_inactive_note")}</p>}

        <dl className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col-reverse rounded-[3px] border border-line bg-raised px-2.5 py-2">
              <dt className="mt-0.5 flex items-center gap-1 text-[11px] leading-tight text-muted">
                <s.icon className="hidden h-3.5 w-3.5 shrink-0 sm:block" aria-hidden="true" />
                <span>{s.label}</span>
              </dt>
              <dd className={cn("text-xl font-medium tabular-nums", s.tone)}>{s.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-[11px] text-faint">{t("office_performance_hint")}</p>
      </section>

      <section aria-labelledby="office-reports" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="office-reports" className="text-base font-semibold">
            {t("office_reports")}
          </h2>
          <nav className="scroll-thin -mx-1 flex max-w-full gap-1.5 overflow-x-auto px-1 py-0.5" aria-label={t("filter_status")}>
            {TABS.map((x) => (
              <Link
                key={x.value}
                href={x.value ? `/offices/${office.id}?status=${x.value}` : `/offices/${office.id}`}
                aria-current={status === x.value ? "page" : undefined}
                scroll={false}
                className={cn(
                  "inline-flex min-h-[36px] shrink-0 items-center rounded-[3px] border px-3 text-xs font-medium transition-colors sm:text-[13px]",
                  status === x.value ? "border-ink bg-ink text-surface" : "border-line bg-surface text-ink-secondary hover:border-line-strong hover:text-ink",
                )}
              >
                {t(x.key)}
              </Link>
            ))}
          </nav>
        </div>

        {items.length === 0 ? (
          <EmptyState icon={Inbox} title={status ? t("empty_filtered_title") : t("office_empty_title")} body={status ? t("empty_filtered_body") : t("office_empty_body")} />
        ) : (
          <Feed key={status} initial={items} hasMore={hasMore} query={query} signedIn={!!session} />
        )}
      </section>
    </div>
  );
}
