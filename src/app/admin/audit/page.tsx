import Link from "next/link";
import { TimeAgo } from "@/components/ui/TimeAgo";
import { getT } from "@/i18n/server";
import { auditEntries } from "@/server/queries/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Audit log" };

export default async function AuditPage({ searchParams }: { searchParams: { page?: string; action?: string } }) {
  const { t } = await getT();
  const page = Number(searchParams.page) || 1;
  const action = searchParams.action?.slice(0, 40) || undefined;
  const { rows, hasMore } = await auditEntries(page, action);
  const href = (p: number) => `/admin/audit?${new URLSearchParams({ ...(action ? { action } : {}), page: String(p) })}`;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">{t("admin_audit")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">{t("audit_hint")}</p>
      </div>
      <form className="flex gap-2" role="search">
        <input name="action" defaultValue={action} className="input rounded-[3px] max-w-xs" placeholder={t("audit_filter_ph")} aria-label={t("audit_filter_ph")} />
        <button className="btn-secondary btn-sm rounded-[3px] font-medium" type="submit">{t("apply")}</button>
      </form>
      <div className="card rounded-[4px] shadow-none overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="px-4 py-2.5 font-semibold">{t("when")}</th>
              <th className="px-4 py-2.5 font-semibold">{t("who")}</th>
              <th className="px-4 py-2.5 font-semibold">{t("action")}</th>
              <th className="px-4 py-2.5 font-semibold">{t("target")}</th>
              <th className="px-4 py-2.5 font-semibold">{t("details")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line/60 align-top last:border-0">
                <td className="whitespace-nowrap px-4 py-2.5"><TimeAgo date={r.createdAt} /></td>
                <td className="px-4 py-2.5">{r.actor ?? "–"}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{r.action}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-muted">{r.targetType ? `${r.targetType}:${(r.targetId ?? "").slice(0, 8)}` : "–"}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-muted" data-ugc>{r.meta ? JSON.stringify(r.meta) : ""}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-left text-muted">{t("no_results")}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {(page > 1 || hasMore) && (
        <nav className="flex items-center justify-between" aria-label={t("pagination")}>
          {page > 1 ? <Link href={href(page - 1)} className="btn-secondary btn-sm rounded-[3px] font-medium">{t("previous")}</Link> : <span />}
          {hasMore && <Link href={href(page + 1)} className="btn-secondary btn-sm rounded-[3px] font-medium">{t("next")}</Link>}
        </nav>
      )}
    </div>
  );
}
