"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/cn";
import { ThemeToggle } from "./ThemeToggle";

export function Footer() {
  const pathname = usePathname();
  const { t } = useI18n();

  // The map is a full-screen view. On the feed, wide screens show these links in the right sidebar instead.
  if (pathname === "/map") return null;

  return (
    <footer className={cn("mt-10 border-t border-line pb-8 pt-6 text-xs text-muted", pathname === "/" && "lg:hidden")}>
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-4">
        <p>
          © {new Date().getFullYear()} Nagorik Desk · {t("footer_tagline")} · Developed by{" "}
          <a
            href="https://xerophytelabs.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-ink underline decoration-line transition-colors hover:decoration-ink"
          >
            xerophytelabs
          </a>
        </p>
        <nav className="flex items-center gap-4" aria-label={t("footer_links")}>
          <Link href="/about" className="py-1 hover:text-ink">
            {t("about")}
          </Link>
          <Link href="/terms" className="py-1 hover:text-ink">
            {t("terms")}
          </Link>
          <Link href="/privacy" className="py-1 hover:text-ink">
            {t("privacy")}
          </Link>
          <ThemeToggle className="md:hidden" />
        </nav>
      </div>
    </footer>
  );
}
