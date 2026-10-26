import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TwoFactorSetup, TwoFactorVerify } from "@/components/auth/TwoFactor";
import { getT } from "@/i18n/server";
import { STAFF_ROLES } from "@/lib/constants";
import { safeNext } from "@/lib/safe-next";
import { pendingTotpSetup } from "@/server/auth/mfa";
import { getSession } from "@/server/auth/session";

export const metadata: Metadata = { title: "Two-step sign-in", robots: { index: false, follow: false } };

export default async function TwoFactorPage({ searchParams }: { searchParams: { next?: string } }) {
  const [{ t }, session] = await Promise.all([getT(), getSession()]);
  const next = safeNext(searchParams.next);
  if (!session) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (!STAFF_ROLES.includes(session.user.role)) redirect(next);
  if (session.mfaVerified && session.user.totpEnabled) redirect(next);

  const setup = session.user.totpEnabled ? null : await pendingTotpSetup(session.user.id, session.user.email);

  return (
    <div className="mx-auto w-full max-w-[460px] px-4 py-10">
      <div className="card rounded-[4px] shadow-none p-6 sm:p-8">
        <h1 className="text-2xl font-semibold">{setup ? t("mfa_setup_title") : t("mfa_title")}</h1>
        <p className="mt-1 text-sm text-muted">{setup ? t("mfa_setup_sub") : t("mfa_sub")}</p>
        <div className="mt-6">
          {setup ? <TwoFactorSetup qrSvg={setup.qrSvg} secret={setup.secret} next={next} /> : <TwoFactorVerify next={next} />}
        </div>
      </div>
    </div>
  );
}
