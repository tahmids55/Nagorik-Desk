"use client";

import { Home, Landmark, MapPin } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/client";

const TABS = [
  { href: "/", key: "nav_home", icon: Home, match: (p: string) => p === "/" || p.startsWith("/issues") },
  { href: "/map", key: "nav_map", icon: MapPin, match: (p: string) => p.startsWith("/map") },
  { href: "/accountability", key: "nav_accountability", icon: Landmark, match: (p: string) => p.startsWith("/accountability") },
] as const;

/** Desktop centre tabs, Facebook style. */
export function NavTabs() {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <nav aria-label={t("nav_main")} className="hidden h-full md:flex">
      {TABS.map(({ href, key, icon: Icon, match }) => (
        <Link key={href} href={href} className="tab" aria-current={match(pathname) ? "page" : undefined}>
          <Icon className="h-[19px] w-[19px]" aria-hidden="true" />
          <span className="hidden lg:inline">{t(key)}</span>
          <span className="sr-only lg:hidden">{t(key)}</span>
        </Link>
      ))}
    </nav>
  );
}
