"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { ThemeToggle } from "./ThemeToggle";

export function Footer() {
  const pathname = usePathname();
  const { t } = useI18n();

  // On the feed, footer is sticky in the right sidebar (Facebook/Twitter style)
  if (pathname === "/") return null;

  return (
    <footer className="mt-10 border-t border-line pb-24 pt-6 text-xs text-muted md:pb-8">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-4">
        <p>
          © {new Date().getFullYear()} Nagorik Desk · {t("footer_tagline")} · Developed by{" "}
          <a
            href="https://xerophytelabs.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-ink underline decoration-line hover:decoration-ink transition-colors"
          >
            xerophytelabs
          </a>
        </p>
        <nav className="flex gap-4" aria-label={t("footer_links")}>
          <Link href="/about" className="hover:text-ink">
            {t("about")}
          </Link>
          <Link href="/terms" className="hover:text-ink">
            {t("terms")}
          </Link>
          <Link href="/privacy" className="hover:text-ink">
            {t("privacy")}
          </Link>
          <ThemeToggle className="md:hidden" />
        </nav>
      </div>
    </footer>
  );
}
