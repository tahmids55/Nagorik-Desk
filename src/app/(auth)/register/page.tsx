import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { getT } from "@/i18n/server";
import { safeNext } from "@/lib/safe-next";
import { getSession } from "@/server/auth/session";
import { areaName, getAreas } from "@/server/queries/reference";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage({ searchParams }: { searchParams: { next?: string } }) {
  const [{ t, lang }, session, areas] = await Promise.all([getT(), getSession(), getAreas()]);
  if (session) redirect("/");
  const next = searchParams.next ? safeNext(searchParams.next) : undefined;

  return (
    <div className="rounded-[4px] border border-line bg-surface p-6 sm:p-8">
      <h1 className="text-2xl font-semibold">{t("join_title")}</h1>
      <p className="mt-1 text-sm text-muted">{t("join_sub")}</p>
      <div className="mt-6">
        <RegisterForm areas={areas.map((a) => ({ id: a.id, parentId: a.parentId, kind: a.kind, label: areaName(a, lang) }))} next={next} />
      </div>
      <p className="mt-6 text-sm text-muted">
        {t("have_account")}{" "}
        <Link href="/login" className="link font-semibold">
          {t("sign_in")}
        </Link>
      </p>
    </div>
  );
}
