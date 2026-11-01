import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import type { ReactNode } from "react";
import { BackToTop } from "@/components/layout/BackToTop";
import { BottomNav } from "@/components/layout/BottomNav";
import { Footer } from "@/components/layout/Footer";
import { TopNav } from "@/components/layout/TopNav";
import { I18nProvider } from "@/i18n/client";
import { getT } from "@/i18n/server";
import { getSession } from "@/server/auth/session";
import "./globals.css";

const THEME_COLOR = { light: "#F3F3F1", dark: "#0E121B" } as const;

/** The saved choice, or null to follow the device setting. */
async function getTheme(): Promise<"light" | "dark" | null> {
  const v = (await cookies()).get("theme")?.value;
  return v === "dark" || v === "light" ? v : null;
}

/** Runs before first paint when no theme was chosen yet, so dark-mode phones never flash white. */
const SYSTEM_THEME_SCRIPT = `try{if(window.matchMedia("(prefers-color-scheme: dark)").matches)document.documentElement.dataset.theme="dark"}catch(e){}`;

export async function generateViewport(): Promise<Viewport> {
  const theme = await getTheme();
  return {
    themeColor: theme
      ? THEME_COLOR[theme]
      : [
          { media: "(prefers-color-scheme: light)", color: THEME_COLOR.light },
          { media: "(prefers-color-scheme: dark)", color: THEME_COLOR.dark },
        ],
    colorScheme: theme ?? "light dark",
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
    title: { default: `Nagorik Desk - ${t("meta_title")}`, template: "%s · Nagorik Desk" },
    description: t("meta_description"),
    applicationName: "Nagorik Desk",
    appleWebApp: { capable: true, title: "Nagorik Desk", statusBarStyle: "default" },
    formatDetection: { telephone: false },
    openGraph: { type: "website", siteName: "Nagorik Desk", title: `Nagorik Desk - ${t("meta_title")}`, description: t("meta_description") },
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [{ lang, t }, session, theme] = await Promise.all([getT(), getSession(), getTheme()]);
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang={lang} data-theme={theme ?? "light"} suppressHydrationWarning>
      <head>
        {!theme && <script nonce={nonce} dangerouslySetInnerHTML={{ __html: SYSTEM_THEME_SCRIPT }} suppressHydrationWarning />}
        {/* Professional Google Fonts: Bilingual Editorial Stack (Bangla + English from MP2) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- App Router root layout: fonts load for every page */}
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
          {/* Phones: 100dvh minus the top bar (3.5rem), the bottom bar (4rem) and the safe areas. */}
          <main id="main" className="min-h-[calc(100dvh-7.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] md:min-h-[calc(100dvh-3.5rem)]">
            {children}
          </main>
          <Footer />
          <BottomNav profileHref={session ? `/u/${session.user.id}` : "/login"} />
          <BackToTop />
        </I18nProvider>
      </body>
    </html>
  );
}
