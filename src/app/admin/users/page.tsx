import { BadgeCheck, ChevronDown, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { RoleForm, StatusForm } from "@/components/admin/UserForms";
import { Avatar } from "@/components/ui/Avatar";
import { TimeAgo } from "@/components/ui/TimeAgo";
import { getT } from "@/i18n/server";
import type { TKey } from "@/i18n/translate";
import { getSession } from "@/server/auth/session";
import { listUsers } from "@/server/queries/admin";
import { getStakeholders } from "@/server/queries/reference";

export const dynamic = "force-dynamic";
export const metadata = { title: "Users" };

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export default async function AdminUsers({ searchParams }: { searchParams: SP }) {
  const [{ t, lang }, session] = await Promise.all([getT(), getSession()]);
  const q = one(searchParams.q);
  const role = one(searchParams.role);
  const page = Number(one(searchParams.page)) || 1;
  const [{ rows, hasMore }, offices] = await Promise.all([listUsers({ q, role, page }), getStakeholders({ activeOnly: true })]);
  const officeOpts = offices.map((o) => ({ id: o.id, name: lang === "bn" && o.nameBn ? o.nameBn : o.nameEn }));
  const href = (p: number) => `/admin/users?${new URLSearchParams({ ...(q ? { q } : {}), ...(role ? { role } : {}), page: String(p) })}`;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">{t("admin_users")}</h1>
      <p className="max-w-2xl text-sm text-muted">{t("admin_users_hint")}</p>

      <form className="card rounded-[4px] shadow-none grid gap-3 p-4 sm:grid-cols-[1fr_200px_auto]" role="search">
        <input name="q" defaultValue={q} className="input rounded-[3px]" placeholder={t("search_users_ph")} aria-label={t("search_users_ph")} maxLength={80} />
        <select name="role" defaultValue={role ?? ""} className="input rounded-[3px]" aria-label={t("role")}>
          <option value="">{t("all_roles")}</option>
          {(["citizen", "authority", "office", "admin"] as const).map((r) => (<option key={r} value={r}>{t(`role_${r}` as TKey)}</option>))}
        </select>
        <button className="btn-secondary btn-sm rounded-[3px] font-medium" type="submit">{t("apply")}</button>
      </form>

      <ul className="card rounded-[4px] shadow-none divide-y divide-line overflow-hidden">
        {rows.map((u) => {
          const self = u.id === session?.user.id;
          return (
            <li key={u.id}>
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-raised">
                  <Avatar name={u.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 text-sm font-semibold">
                      {u.name}
                      {self && <span className="text-xs font-normal text-faint">({t("you")})</span>}
                      {u.emailVerified && <BadgeCheck className="h-4 w-4 text-ok" aria-label={t("email_verified")} />}
                      {u.role !== "citizen" && u.mfaEnabled && <ShieldCheck className="h-4 w-4 text-ok" aria-label={t("mfa_active")} />}
                    </span>
                    <span className="block truncate text-xs text-muted">{u.email}</span>
                  </span>
                  <span className="hidden text-xs text-faint sm:block"><TimeAgo date={u.createdAt} /></span>
                  <span className="rounded-[2px] border border-line px-2 py-0.5 text-xs font-medium text-muted">
                    {t(`role_${u.role}` as TKey)}
                    {u.stakeholderName && ` · ${u.stakeholderName}`}
                  </span>
                  {u.status === "suspended" && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-danger">
                      <span className="h-[9px] w-[9px] rounded-[1px] bg-danger shrink-0" aria-hidden="true" />
                      {t("suspended")}
                    </span>
                  )}
                  <ChevronDown className="h-4 w-4 text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="space-y-5 border-t border-line p-4">
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
                    <Link href={`/u/${u.id}`} className="link">{t("view_profile")}</Link>
                    {u.statusReason && <span>{t("suspend_reason")}: {u.statusReason}</span>}
                  </div>
                  {self ? (
                    <p className="text-sm text-muted">{t("err_cannot_change_self")}</p>
                  ) : (
                    <>
                      <RoleForm userId={u.id} role={u.role} stakeholderId={u.stakeholderId} officeTitle={u.officeTitle} offices={officeOpts} />
                      <div className="border-t border-line pt-4">
                        <StatusForm userId={u.id} suspended={u.status === "suspended"} />
                      </div>
                    </>
                  )}
                </div>
              </details>
            </li>
          );
        })}
        {rows.length === 0 && <li className="p-6 text-left text-sm text-muted">{t("no_results")}</li>}
      </ul>

      {(page > 1 || hasMore) && (
        <nav className="flex items-center justify-between" aria-label={t("pagination")}>
          {page > 1 ? <Link href={href(page - 1)} className="btn-secondary btn-sm rounded-[3px] font-medium">{t("previous")}</Link> : <span />}
          {hasMore && <Link href={href(page + 1)} className="btn-secondary btn-sm rounded-[3px] font-medium">{t("next")}</Link>}
        </nav>
      )}
    </div>
  );
}
