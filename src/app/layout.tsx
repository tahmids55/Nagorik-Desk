import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { BottomNav } from "@/components/layout/BottomNav";
import { Footer } from "@/components/layout/Footer";
import { TopNav } from "@/components/layout/TopNav";
import { I18nProvider } from "@/i18n/client";
import { getT } from "@/i18n/server";
import { getSession } from "@/server/auth/session";
import "./globals.css";

async function getTheme(): Promise<"light" | "dark"> {
  return (await cookies()).get("theme")?.value === "dark" ? "dark" : "light";
}

export async function generateViewport(): Promise<Viewport> {
  const theme = await getTheme();
  return {
    themeColor: theme === "dark" ? "#0E121B" : "#F3F3F1",
    colorScheme: theme,
    width: "device-width",
    initialScale: 1,
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
    title: { default: `Nagorik PG - ${t("meta_title")}`, template: "%s · Nagorik PG" },
    description: t("meta_description"),
    applicationName: "Nagorik PG",
    openGraph: { type: "website", siteName: "Nagorik PG", title: `Nagorik PG - ${t("meta_title")}`, description: t("meta_description") },
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [{ lang, t }, session, theme] = await Promise.all([getT(), getSession(), getTheme()]);
  return (
    <html lang={lang} data-theme={theme} suppressHydrationWarning>
      <head>
        {/* Professional Google Fonts: Bilingual Editorial Stack (Bangla + English from MP2) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Anek+Bangla:wght@500;600;700;800&family=Hind+Siliguri:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&family=Noto+Serif+Bengali:wght@500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Tiro+Bangla:ital@0;1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <I18nProvider lang={lang}>
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-[3px] focus:bg-brand focus:px-4 focus:py-2 focus:text-[var(--btn-primary-text)]">
            {t("skip_to_content")}
          </a>
          <TopNav />
          <main id="main">{children}</main>
          <Footer />
          <BottomNav profileHref={session ? `/u/${session.user.id}` : "/login"} />
        </I18nProvider>
      </body>
    </html>
  );
}
