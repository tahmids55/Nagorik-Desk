"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useFormState } from "react-dom";
import { FieldError, FormAlert, SubmitButton } from "@/components/ui/forms";
import { useI18n } from "@/i18n/client";
import { LIMITS } from "@/lib/constants";
import { register } from "@/server/actions/auth";

export type AreaOption = { id: string; parentId: string | null; label: string; kind: "upazila" | "union" };

export function RegisterForm({ areas, next }: { areas: AreaOption[]; next?: string }) {
  const { t } = useI18n();
  const [state, action] = useFormState(register, null);
  const [upazila, setUpazila] = useState("");
  const upazilas = useMemo(() => areas.filter((a) => a.kind === "upazila"), [areas]);
  const unions = useMemo(() => areas.filter((a) => a.kind === "union" && a.parentId === upazila), [areas, upazila]);

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <div>
        <label htmlFor="name" className="label">
          {t("full_name")}
        </label>
        <input id="name" name="name" autoComplete="name" required minLength={LIMITS.nameMin} maxLength={LIMITS.nameMax} className="input" />
        <FieldError state={state} name="name" />
      </div>
      <div>
        <label htmlFor="email" className="label">
          {t("email")}
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" />
        <FieldError state={state} name="email" />
      </div>
      <div>
        <label htmlFor="password" className="label">
          {t("password")}
        </label>
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={LIMITS.passwordMin} className="input" />
        <p className="hint">{t("password_hint", { n: LIMITS.passwordMin })}</p>
        <FieldError state={state} name="password" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="upazilaId" className="label">
            {t("upazila")}
          </label>
          <select id="upazilaId" name="upazilaId" required className="input" value={upazila} onChange={(e) => setUpazila(e.target.value)}>
            <option value="">{t("select")}</option>
            {upazilas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
          <FieldError state={state} name="upazilaId" />
        </div>
        <div>
          <label htmlFor="unionId" className="label">
            {t("union")} <span className="font-normal text-muted">({t("optional")})</span>
          </label>
          <select id="unionId" name="unionId" className="input" disabled={!upazila} defaultValue="">
            <option value="">{t("select")}</option>
            {unions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
          <FieldError state={state} name="unionId" />
        </div>
      </div>
      <p className="hint -mt-2">{t("area_privacy_hint")}</p>
      <div>
        <label className="flex items-start gap-2.5 text-sm text-muted">
          <input type="checkbox" name="acceptTerms" className="mt-1 h-4 w-4 rounded-[3px] border border-line accent-brand" required />
          <span>
            {t("accept_terms_a")}{" "}
            <Link href="/terms" className="link" target="_blank">
              {t("terms")}
            </Link>{" "}
            {t("accept_terms_b")}{" "}
            <Link href="/privacy" className="link" target="_blank">
              {t("privacy")}
            </Link>
            .
          </span>
        </label>
        <FieldError state={state} name="acceptTerms" />
      </div>
      <FormAlert state={state} />
      <SubmitButton className="w-full">{t("create_account")}</SubmitButton>
    </form>
  );
}
