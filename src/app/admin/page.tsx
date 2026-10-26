import { Ban, Flag, ShieldAlert, Users } from "lucide-react";
import Link from "next/link";
import { getT } from "@/i18n/server";
import { formatNumber } from "@/i18n/translate";
import { features } from "@/server/env";
import { adminCounts } from "@/server/queries/admin";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const [{ t, lang }, c] = await Promise.all([getT(), adminCounts()]);
  const n = (v: number) => formatNumber(v, lang);
  const f = features();
  const card = (href: string, Icon: typeof Users, label: string, value: number) => (
    <Link href={href} className="card rounded-[4px] shadow-none p-4 hover:border-brand/50">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted">
        <Icon className="h-4 w-4 text-brand" aria-hidden="true" />
        {label}
      </div>
      <p className="mt-2 text-3xl font-medium tabular-nums">{n(value)}</p>
    </Link>
  );
  const rows: [string, boolean][] = [
    [t("integration_email"), f.email],
    [t("integration_sms"), f.sms],
    [t("integration_maps"), f.maps],
    [t("integration_nid"), f.nid],
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">{t("admin_overview")}</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {card("/admin/users", Users, t("admin_total_users"), c.users)}
        {card("/admin/users?role=office", ShieldAlert, t("admin_staff_accounts"), c.staff)}
        {card("/admin/moderation", Flag, t("admin_open_flags"), c.openFlags)}
        {card("/admin/users", Ban, t("admin_suspended"), c.suspended)}
      </div>

      <section className="card rounded-[4px] shadow-none p-5" aria-labelledby="int-h">
        <h2 id="int-h" className="text-lg font-semibold">{t("integrations")}</h2>
        <p className="mt-1 text-sm text-muted">{t("integrations_hint")}</p>
        <ul className="mt-4 divide-y divide-line">
          {rows.map(([label, on]) => (
            <li key={label} className="flex items-center justify-between py-2.5 text-sm">
              <span>{label}</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink">
                <span className={`h-[9px] w-[9px] rounded-[1px] shrink-0 ${on ? "bg-ok" : "bg-warn"}`} aria-hidden="true" />
                {on ? t("configured") : t("not_configured")}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
