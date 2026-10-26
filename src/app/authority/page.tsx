import { Inbox } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { IssueTable } from "@/components/staff/IssueTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { getT } from "@/i18n/server";
import { formatNumber } from "@/i18n/translate";
import { cn } from "@/lib/cn";
import { requirePermission } from "@/server/auth/guards";
import { getStakeholders } from "@/server/queries/reference";
import { assignmentCounts, assignmentsFor } from "@/server/queries/staff";

export const metadata: Metadata = { title: "My assignments", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AuthorityHome({ searchParams }: { searchParams: { tab?: string } }) {
  const { user } = await requirePermission("authority:view", "/authority");
  const { t, lang } = await getT();
  const tab = (["todo", "active", "done"] as const).find((x) => x === searchParams.tab) ?? "todo";
  const sid = user.stakeholderId!;
  const [counts, rows, offices] = await Promise.all([assignmentCounts(sid), assignmentsFor(sid, tab), getStakeholders()]);
  const office = offices.find((o) => o.id === sid);
  const n = (v: number) => formatNumber(v, lang);

  const tabs = [
    { key: "todo", label: t("tab_todo"), count: counts.todo },
    { key: "active", label: t("tab_active"), count: counts.active },
    { key: "done", label: t("tab_done"), count: counts.done },
  ] as const;

  return (
    <div className="mx-auto max-w-[980px] space-y-5 px-3 py-6 sm:px-4">
      <div>
        <p className="text-sm font-semibold text-muted">{office ? (lang === "bn" && office.nameBn ? office.nameBn : office.nameEn) : ""}</p>
        <h1 className="text-2xl font-semibold">{t("my_assignments")}</h1>
        <p className="mt-1 text-sm text-muted">{t("authority_sub")}</p>
      </div>

      {counts.overdue > 0 && (
        <p role="status" className="rounded-[3px] border border-danger/40 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">
          {t("authority_overdue_warning", { n: n(counts.overdue) })}
        </p>
      )}

      <nav className="flex gap-1 border-b border-line" aria-label={t("my_assignments")}>
        {tabs.map((x) => (
          <Link key={x.key} href={`/authority?tab=${x.key}`} aria-current={tab === x.key ? "page" : undefined} className={cn("relative px-4 py-3 text-sm font-semibold", tab === x.key ? "text-brand after:absolute after:inset-x-2 after:bottom-0 after:h-[3px] after:rounded-t-[2px] after:bg-brand" : "text-muted hover:text-ink")}>
            {x.label} <span className="ml-1 rounded-[2px] bg-raised px-2 py-0.5 text-xs font-medium tabular-nums">{n(x.count)}</span>
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? <EmptyState icon={Inbox} title={t(`empty_${tab}_title` as "empty_todo_title")} body={t(`empty_${tab}_body` as "empty_todo_body")} /> : <IssueTable rows={rows} showOffice={false} />}
    </div>
  );
}
