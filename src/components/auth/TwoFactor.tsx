"use client";

import { Copy, Download, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useFormState } from "react-dom";
import { FormAlert, SubmitButton } from "@/components/ui/forms";
import { useI18n } from "@/i18n/client";
import { confirmTotpSetup, verifyTwoFactor } from "@/server/actions/auth";

export function TwoFactorVerify({ next }: { next: string }) {
  const { t } = useI18n();
  const [state, action] = useFormState(verifyTwoFactor, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="code" className="label">
          {t("auth_code")}
        </label>
        <input id="code" name="code" autoComplete="one-time-code" autoFocus required className="input text-center text-lg tracking-[0.3em]" placeholder="123456" />
        <p className="hint">{t("auth_code_hint")}</p>
      </div>
      <FormAlert state={state} />
      <SubmitButton className="w-full">{t("verify")}</SubmitButton>
    </form>
  );
}

export function TwoFactorSetup({ qrSvg, secret, next }: { qrSvg: string; secret: string; next: string }) {
  const { t } = useI18n();
  const [state, action] = useFormState(confirmTotpSetup, null);
  const [copied, setCopied] = useState(false);

  if (state?.ok) {
    const codes = state.data!.recoveryCodes;
    const text = codes.join("\n");
    const download = () => {
      const url = URL.createObjectURL(new Blob([`Nagorik PG recovery codes\n\n${text}\n`], { type: "text/plain" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "nagorik-pg-recovery-codes.txt";
      a.click();
      URL.revokeObjectURL(url);
    };
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-ok">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          <p className="font-semibold">{t("mfa_enabled")}</p>
        </div>
        <p className="text-sm text-muted">{t("recovery_intro")}</p>
        <ul className="grid grid-cols-2 gap-2 rounded-[3px] border border-line bg-raised p-4 font-mono text-sm" data-testid="recovery-codes">
          {codes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-secondary btn-sm flex-1"
            onClick={async () => {
              await navigator.clipboard.writeText(text);
              setCopied(true);
            }}
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
            {copied ? t("copied") : t("copy")}
          </button>
          <button type="button" className="btn-secondary btn-sm flex-1" onClick={download}>
            <Download className="h-4 w-4" aria-hidden="true" />
            {t("download")}
          </button>
        </div>
        <Link href={next} className="btn-primary w-full">
          {t("continue")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
        <li>{t("mfa_step_1")}</li>
        <li>{t("mfa_step_2")}</li>
        <li>{t("mfa_step_3")}</li>
      </ol>
      <div className="flex flex-col items-start gap-3">
        {/* Server-generated SVG QR code of the otpauth:// URL */}
        <div className="rounded-[3px] border border-line bg-white p-2" dangerouslySetInnerHTML={{ __html: qrSvg }} role="img" aria-label={t("qr_alt")} />
        <p className="text-xs text-muted">
          {t("cant_scan")} <code className="select-all break-all rounded-[2px] bg-raised px-1.5 py-0.5 font-mono text-[13px] text-ink">{secret}</code>
        </p>
      </div>
      <form action={action} className="space-y-4">
        <div>
          <label htmlFor="code" className="label">
            {t("auth_code")}
          </label>
          <input id="code" name="code" inputMode="numeric" pattern="[0-9 ]{6,7}" autoComplete="one-time-code" required className="input text-center text-lg tracking-[0.3em]" placeholder="123456" />
        </div>
        <FormAlert state={state} />
        <SubmitButton className="w-full">{t("enable_mfa")}</SubmitButton>
      </form>
    </div>
  );
}
