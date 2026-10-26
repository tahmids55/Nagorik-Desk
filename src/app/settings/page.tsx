import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { DeleteAccountForm, PasswordForm, ProfileForm, SignOutEverywhere, VerificationSection } from "@/components/profile/SettingsForms";
import { getT } from "@/i18n/server";
import { STAFF_ROLES } from "@/lib/constants";
import { requireUser } from "@/server/auth/guards";
import { db } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { features } from "@/server/env";
import { areaName, getAreas } from "@/server/queries/reference";
import { eq } from "drizzle-orm";
import { LangToggle } from "@/components/layout/LangToggle";

export const metadata: Metadata = { title: "Settings", robots: { index: false } };

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card rounded-[4px] shadow-none p-5 sm:p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default async function SettingsPage() {
  const { user } = await requireUser("/settings");
  const [{ t, lang }, areas] = await Promise.all([getT(), getAreas()]);
  const [row] = await db().select().from(users).where(eq(users.id, user.id));
  const f = features();
  const isStaff = STAFF_ROLES.includes(user.role);

  return (
    <div className="mx-auto max-w-[720px] space-y-4 px-3 py-6 sm:px-4">
      <h1 className="text-2xl font-semibold">{t("settings")}</h1>

      <Section title={t("settings_profile")}>
        <ProfileForm
          name={row!.name}
          bio={row!.bio ?? ""}
          avatarMediaId={row!.avatarMediaId}
          upazilaId={row!.upazilaId ?? areas.find((a) => a.kind === "upazila")!.id}
          unionId={row!.unionId ?? ""}
          areas={areas.map((a) => ({ id: a.id, parentId: a.parentId, kind: a.kind, label: areaName(a, lang) }))}
        />
      </Section>

      <Section title={t("settings_verification")} hint={t("settings_verification_hint")}>
        <VerificationSection email={row!.email} emailVerified={!!row!.emailVerifiedAt} phone={row!.phone} phoneVerified={!!row!.phoneVerifiedAt} emailEnabled={f.email} smsEnabled={f.sms} />
      </Section>

      <Section title={t("settings_language")}>
        <div className="flex items-center gap-3">
          <LangToggle variant="icon" />
          <span className="text-sm text-muted">{lang === "bn" ? "বাংলা" : "English"}</span>
        </div>
      </Section>

      <Section title={t("settings_security")}>
        {isStaff && (
          <p className="mb-5 flex items-center gap-2 rounded-[3px] bg-ok/10 px-3 py-2 text-sm text-ok">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            {t("mfa_active")}
          </p>
        )}
        <PasswordForm />
        <div className="mt-6 border-t border-line pt-5">
          <p className="mb-3 text-sm text-muted">{t("sign_out_everywhere_hint")}</p>
          <SignOutEverywhere />
        </div>
      </Section>

      {!isStaff && (
        <Section title={t("settings_danger")} hint={t("settings_danger_hint")}>
          <DeleteAccountForm />
        </Section>
      )}
    </div>
  );
}
