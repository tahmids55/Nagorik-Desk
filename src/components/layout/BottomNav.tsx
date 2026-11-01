"use client";

import { Home, Landmark, MapPin, Plus, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/cn";

/** Mobile bottom bar. The centre button is the main action: report an issue. */
export function BottomNav({ profileHref }: { profileHref: string }) {
  const pathname = usePathname();
  const { t } = useI18n();

  // The report form has its own sticky submit bar, so the tab bar steps aside there.
  if (pathname.startsWith("/new")) return null;

  const item = (href: string, label: string, Icon: typeof Home, active: boolean) => (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-medium leading-tight transition-colors active:bg-neutral-fill/60",
        active ? "text-brand" : "text-muted",
      )}
    >
      {active && <span className="absolute inset-x-5 top-0 h-[2px] rounded-b-[2px] bg-brand" aria-hidden="true" />}
      <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.25 : 2} aria-hidden="true" />
      <span className="max-w-full truncate px-0.5">{label}</span>
    </Link>
  );

  const me = ["/u/", "/settings", "/saved", "/notifications"].some((p) => pathname.startsWith(p)) || pathname === "/login" || pathname === "/register";

  return (
    <>
      {/* Keeps the end of every page clear of the fixed bar. */}
      <div className="h-[calc(4rem+env(safe-area-inset-bottom))] md:hidden" aria-hidden="true" />
      <nav
        aria-label={t("nav_main")}
        className="fixed inset-x-0 bottom-0 z-40 flex h-[calc(4rem+env(safe-area-inset-bottom))] border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_3px_rgba(0,0,0,0.05)] backdrop-blur-md md:hidden"
      >
        {item("/", t("nav_home"), Home, pathname === "/" || pathname.startsWith("/issues"))}
        {item("/map", t("nav_map"), MapPin, pathname.startsWith("/map"))}
        <Link
          href="/new"
          aria-label={t("report_issue")}
          className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-medium leading-tight text-muted transition-transform active:scale-95"
        >
          <span className="flex h-[26px] w-[34px] items-center justify-center rounded-[3px] bg-brand text-[var(--btn-primary-text)] shadow-sm">
            <Plus className="h-[18px] w-[18px]" strokeWidth={2.5} aria-hidden="true" />
          </span>
          <span className="max-w-full truncate px-0.5">{t("nav_report_short")}</span>
        </Link>
        {item("/accountability", t("nav_accountability_short"), Landmark, pathname.startsWith("/accountability") || pathname.startsWith("/offices"))}
        {item(profileHref, t("nav_me"), User, me)}
      </nav>
    </>
  );
}
