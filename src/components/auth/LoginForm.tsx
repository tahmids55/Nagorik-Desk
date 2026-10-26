"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { FormAlert, FormSuccess, SubmitButton } from "@/components/ui/forms";
import { useI18n } from "@/i18n/client";
import { login } from "@/server/actions/auth";

export function LoginForm({ next, justReset, emailResetEnabled }: { next?: string; justReset: boolean; emailResetEnabled: boolean }) {
  const { t } = useI18n();
  const [state, action] = useFormState(login, null);
  return (
    <form action={action} className="space-y-4" noValidate>
      {justReset && <FormSuccess>{t("password_reset_done")}</FormSuccess>}
      <input type="hidden" name="next" value={next ?? ""} />
      <div>
        <label htmlFor="email" className="label">
          {t("email")}
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="label !mb-1.5">
            {t("password")}
          </label>
          <Link href="/forgot" className="link mb-1.5 text-xs">
            {t("forgot_password")}
          </Link>
        </div>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
        {!emailResetEnabled && <span className="sr-only">{t("reset_by_admin")}</span>}
      </div>
      <FormAlert state={state} />
      <SubmitButton className="w-full">{t("sign_in")}</SubmitButton>
    </form>
  );
}
