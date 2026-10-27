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
  const item = (href: string, label: string, Icon: typeof Home, active: boolean) => (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn("flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium", active ? "text-brand" : "text-muted")}
    >
      <Icon className="h-[22px] w-[22px]" aria-hidden="true" />
      {label}
    </Link>
  );
  return (
    <nav
      aria-label={t("nav_main")}
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface/95 backdrop-blur-md pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1 md:hidden shadow-[0_-1px_3px_rgba(0,0,0,0.05)]"
    >
      {item("/", t("nav_home"), Home, pathname === "/" || pathname.startsWith("/issues"))}
      {item("/map", t("nav_map"), MapPin, pathname.startsWith("/map"))}
      <Link
        href="/new"
        aria-current={pathname.startsWith("/new") ? "page" : undefined}
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-medium active:scale-95 transition-transform",
          pathname.startsWith("/new") ? "text-brand" : "text-muted"
        )}
        aria-label={t("report_issue")}
      >
        <span className="flex h-[26px] w-[26px] items-center justify-center rounded-[3px] bg-brand text-[var(--btn-primary-text)] shadow-sm">
          <Plus className="h-4 w-4" aria-hidden="true" />
        </span>
        {t("report_issue")}
      </Link>
      {item("/accountability", t("nav_accountability_short"), Landmark, pathname.startsWith("/accountability"))}
      {item(profileHref, t("nav_me"), User, pathname.startsWith("/u/") || pathname.startsWith("/settings") || pathname === "/login")}
    </nav>
  );
}
