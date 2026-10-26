"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { FieldError, FormAlert, FormSuccess, SubmitButton } from "@/components/ui/forms";
import { useI18n } from "@/i18n/client";
import { LIMITS } from "@/lib/constants";
import { requestPasswordReset, resetPassword } from "@/server/actions/auth";

export function ForgotForm() {
  const { t } = useI18n();
  const [reqState, reqAction] = useFormState(requestPasswordReset, null);
  const [resState, resAction] = useFormState(resetPassword, null);
  const [email, setEmail] = useState("");
  const sent = reqState?.ok === true;

  return (
    <div className="space-y-6">
      <form action={reqAction} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="label">
            {t("email")}
          </label>
          <input id="email" name="email" type="email" required autoComplete="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          <FieldError state={reqState} name="email" />
        </div>
        <FormAlert state={reqState} />
        {sent && <FormSuccess>{t("reset_code_sent")}</FormSuccess>}
        <SubmitButton variant={sent ? "secondary" : "primary"} className="w-full">
          {sent ? t("resend_code") : t("send_code")}
        </SubmitButton>
      </form>

      {sent && (
        <form action={resAction} className="space-y-4 border-t border-line pt-6" noValidate>
          <input type="hidden" name="email" value={email} />
          <div>
            <label htmlFor="code" className="label">
              {t("six_digit_code")}
            </label>
            <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required className="input text-center text-lg tracking-[0.4em]" />
          </div>
          <div>
            <label htmlFor="password" className="label">
              {t("new_password")}
            </label>
            <input id="password" name="password" type="password" autoComplete="new-password" required minLength={LIMITS.passwordMin} className="input" />
            <FieldError state={resState} name="password" />
          </div>
          <FormAlert state={resState} />
          <SubmitButton className="w-full">{t("reset_password")}</SubmitButton>
        </form>
      )}
    </div>
  );
}
