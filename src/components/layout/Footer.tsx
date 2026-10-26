import Link from "next/link";
import { getT } from "@/i18n/server";
import { ThemeToggle } from "./ThemeToggle";

export async function Footer() {
  const { t } = await getT();
  return (
    <footer className="mt-10 border-t border-line pb-24 pt-6 text-xs text-muted md:pb-8">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-4">
        <p>
          © {new Date().getFullYear()} Nagorik PG · {t("footer_tagline")}
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
