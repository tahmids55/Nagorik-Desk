import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { getT } from "@/i18n/server";
import { safeNext } from "@/lib/safe-next";
import { getSession } from "@/server/auth/session";
import { features } from "@/server/env";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: { next?: string; reset?: string } }) {
  const [{ t }, session] = await Promise.all([getT(), getSession()]);
  const next = safeNext(searchParams.next);
  if (session) redirect(next);

  return (
    <div className="rounded-[4px] border border-line bg-surface p-6 sm:p-8">
      <h1 className="text-2xl font-semibold">{t("welcome_back")}</h1>
      <p className="mt-1 text-sm text-muted">{t("login_sub")}</p>
      <div className="mt-6">
        <LoginForm next={searchParams.next ? next : undefined} justReset={searchParams.reset === "1"} emailResetEnabled={features().email} />
      </div>
      <p className="mt-6 text-sm text-muted">
        {t("new_here")}{" "}
        <Link href={`/register${searchParams.next ? `?next=${encodeURIComponent(next)}` : ""}`} className="link font-semibold">
          {t("create_account")}
        </Link>
      </p>
    </div>
  );
}
