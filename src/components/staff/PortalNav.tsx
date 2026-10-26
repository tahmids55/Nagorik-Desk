"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export type PortalLink = { href: string; label: string; exact?: boolean };

export function PortalNav({ title, links }: { title: string; links: PortalLink[] }) {
  const pathname = usePathname();
  return (
    <div className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-6 gap-y-1 px-3 sm:px-4">
        <p className="py-3 text-sm font-semibold text-ink">{title}</p>
        <nav className="scroll-thin flex gap-1 overflow-x-auto" aria-label={title}>
          {links.map((l) => {
            const on = l.exact ? pathname === l.href : pathname.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href} aria-current={on ? "page" : undefined} className={cn("relative whitespace-nowrap px-3 py-3 text-sm font-semibold", on ? "text-ink after:absolute after:inset-x-2 after:bottom-0 after:h-[3px] after:rounded-t-[2px] after:bg-brand" : "text-muted hover:text-ink")}>
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
