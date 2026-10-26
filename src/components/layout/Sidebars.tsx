import { Bell, Briefcase, FileText, Landmark, MapPin, Settings, Shield, Wrench } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { getT } from "@/i18n/server";
import { formatNumber } from "@/i18n/translate";
import { getSession } from "@/server/auth/session";
import { getOverview } from "@/server/queries/stats";
import { areaName, getAreas } from "@/server/queries/reference";

export async function SidebarLeft() {
  const [{ t, lang }, session, areas] = await Promise.all([getT(), getSession(), getAreas()]);
  const link = "flex items-center gap-3 rounded-[3px] px-3 py-2 text-sm font-medium text-muted hover:bg-neutral-fill hover:text-ink";

  if (!session) {
    return (
      <div className="card p-5">
        <h2 className="text-base font-semibold">{t("join_card_title")}</h2>
        <p className="mt-1.5 text-sm text-muted">{t("join_card_body")}</p>
        <Link href="/register" className="btn-secondary mt-4 w-full">
          {t("create_account")}
        </Link>
        <Link href="/login" className="btn-secondary mt-2 w-full">
          {t("sign_in")}
        </Link>
      </div>
    );
  }

  const u = session.user;
  const area = areas.find((a) => a.id === u.unionId) ?? areas.find((a) => a.id === u.upazilaId);
  const portal =
    u.role === "office" ? { href: "/office", label: t("portal_office"), icon: Briefcase }
    : u.role === "authority" ? { href: "/authority", label: t("portal_authority"), icon: Wrench }
    : u.role === "admin" ? { href: "/admin", label: t("portal_admin"), icon: Shield }
    : null;

  return (
    <div className="card p-2">
      <Link href={`/u/${u.id}`} className="flex items-center gap-3 rounded-[3px] p-2 hover:bg-neutral-fill">
        <Avatar name={u.name} mediaId={u.avatarMediaId} size="md" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{u.name}</span>
          <span className="block truncate text-xs text-muted">{areaName(area, lang)}</span>
        </span>
      </Link>
      <hr className="my-1.5 border-line" />
      {portal && (
        <Link href={portal.href} className={link}>
          <portal.icon className="h-[18px] w-[18px] text-brand" aria-hidden="true" />
          {portal.label}
        </Link>
      )}
      <Link href="/new" className={link}>
        <FileText className="h-[18px] w-[18px] text-brand" aria-hidden="true" />
        {t("report_issue")}
      </Link>
      <Link href="/map" className={link}>
        <MapPin className="h-[18px] w-[18px]" aria-hidden="true" />
        {t("nav_map")}
      </Link>
      <Link href="/accountability" className={link}>
        <Landmark className="h-[18px] w-[18px]" aria-hidden="true" />
        {t("nav_accountability")}
      </Link>
      <Link href="/notifications" className={link}>
        <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
        {t("notifications")}
      </Link>
      <Link href="/settings" className={link}>
        <Settings className="h-[18px] w-[18px]" aria-hidden="true" />
        {t("settings")}
      </Link>
    </div>
  );
}

export async function SidebarRight() {
  const [{ t, lang }, o] = await Promise.all([getT(), getOverview()]);
  const n = (v: number) => formatNumber(v, lang);
  return (
    <div className="space-y-4">
      <section className="card p-4" aria-labelledby="pulse-title">
        <h2 id="pulse-title" className="text-sm font-semibold">
          {t("constituency_pulse")}
        </h2>
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-[3px] border border-line bg-neutral-fill/40 p-2.5">
            <dd className="text-xl font-medium">{n(o.total)}</dd>
            <dt className="text-[11px] text-muted">{t("stat_reported")}</dt>
          </div>
          <div className="rounded-[3px] border border-line bg-neutral-fill/40 p-2.5">
            <dd className="text-xl font-medium text-ok">{n(o.resolved)}</dd>
            <dt className="text-[11px] text-muted">{t("stat_solved")}</dt>
          </div>
          <div className="rounded-[3px] border border-line bg-neutral-fill/40 p-2.5">
            <dd className="text-xl font-medium">{o.medianDaysToResolve === null ? "–" : n(o.medianDaysToResolve)}</dd>
            <dt className="text-[11px] text-muted">{t("stat_median_days")}</dt>
          </div>
        </dl>
        <p className="mt-3 text-[11px] text-muted">{t("stats_computed_note")}</p>
        <Link href="/accountability" className="link mt-2 inline-block text-sm font-medium">
          {t("see_scorecard")}
        </Link>
      </section>
      <section className="card p-4">
        <h2 className="text-sm font-semibold">{t("how_it_works")}</h2>
        <ol className="mt-3 space-y-3 text-sm text-muted">
          {(["how_1", "how_2", "how_3"] as const).map((k, i) => (
            <li key={k} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[3px] bg-brand-tint text-xs font-medium text-brand">{n(i + 1)}</span>
              <span>{t(k)}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Facebook-style sticky sidebar footer */}
      <footer className="px-1 pt-1 text-[12px] text-muted space-y-1.5" aria-label={t("footer_links")}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Link href="/about" className="hover:text-ink hover:underline">
            {t("about")}
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/terms" className="hover:text-ink hover:underline">
            {t("terms")}
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/privacy" className="hover:text-ink hover:underline">
            {t("privacy")}
          </Link>
        </div>
        <p className="text-[11px] text-muted leading-tight">
          © {new Date().getFullYear()} Nagorik Desk · Developed by{" "}
          <a
            href="https://xerophytelabs.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink font-medium hover:underline"
          >
            xerophytelabs
          </a>
        </p>
      </footer>
    </div>
  );
}
