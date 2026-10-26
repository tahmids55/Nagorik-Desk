import type { Metadata } from "next";
import Link from "next/link";
import { ForgotForm } from "@/components/auth/ForgotForm";
import { getT } from "@/i18n/server";
import { features } from "@/server/env";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export default async function ForgotPage() {
  const { t } = await getT();
  const enabled = features().email;
  return (
    <div className="rounded-[4px] border border-line bg-surface p-6 sm:p-8">
      <h1 className="text-2xl font-semibold">{t("forgot_title")}</h1>
      {enabled ? (
        <>
          <p className="mt-1 text-sm text-muted">{t("forgot_sub")}</p>
          <div className="mt-6">
            <ForgotForm />
          </div>
        </>
      ) : (
        <p className="mt-3 rounded-[3px] border border-warn/40 bg-warn/10 p-4 text-sm text-warn">{t("reset_by_admin")}</p>
      )}
      <p className="mt-6 text-sm">
        <Link href="/login" className="link font-semibold">
          {t("back_to_sign_in")}
        </Link>
      </p>
    </div>
  );
}
