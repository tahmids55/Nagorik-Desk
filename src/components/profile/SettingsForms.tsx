"use client";

import { Fingerprint, Mail, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useFormState } from "react-dom";
import { Avatar } from "@/components/ui/Avatar";
import { FieldError, FormAlert, FormSuccess, SubmitButton, useErrorText } from "@/components/ui/forms";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/cn";
import { LIMITS } from "@/lib/constants";
import { changePassword, logoutEverywhere, sendEmailVerification, verifyEmail } from "@/server/actions/auth";
import { confirmPhoneVerification, deleteAccount, removeAvatar, startPhoneVerification, updateProfile } from "@/server/actions/profile";

export type AreaOpt = { id: string; parentId: string | null; kind: "upazila" | "union"; label: string };

export function ProfileForm({ name, bio, avatarMediaId, upazilaId, unionId, areas }: { name: string; bio: string; avatarMediaId: string | null; upazilaId: string; unionId: string; areas: AreaOpt[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [state, action] = useFormState(updateProfile, null);
  const [upazila, setUpazila] = useState(upazilaId);
  const [avatarIds, setAvatarIds] = useState<string[]>([]);
  const [bioText, setBioText] = useState(bio);
  const [pending, start] = useTransition();
  const unions = useMemo(() => areas.filter((a) => a.kind === "union" && a.parentId === upazila), [areas, upazila]);

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="avatarMediaId" value={avatarIds[0] ?? ""} />
      <div className="flex items-center gap-4">
        <Avatar name={name} mediaId={avatarMediaId} size="lg" />
        <div className="min-w-0 flex-1">
          <span className="label">{t("profile_photo")}</span>
          <ImageUploader max={1} onChange={setAvatarIds} label={t("change_photo")} />
          {avatarMediaId && (
            <button type="button" className="link mt-1 text-xs" disabled={pending} onClick={() => start(async () => { await removeAvatar(); router.refresh(); })}>
              {t("remove_photo")}
            </button>
          )}
        </div>
      </div>
      <div>
        <label htmlFor="name" className="label">{t("full_name")}</label>
        <input id="name" name="name" defaultValue={name} required minLength={LIMITS.nameMin} maxLength={LIMITS.nameMax} className="input rounded-[3px]" />
        <FieldError state={state} name="name" />
      </div>
      <div>
        <label htmlFor="bio" className="label">{t("bio")}</label>
        <textarea id="bio" name="bio" rows={3} maxLength={LIMITS.bioMax} value={bioText} onChange={(e) => setBioText(e.target.value)} className="input rounded-[3px]" placeholder={t("bio_ph")} />
        <div className="flex justify-between">
          <FieldError state={state} name="bio" />
          <span className="hint ml-auto">{bioText.length}/{LIMITS.bioMax}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="upazilaId" className="label">{t("upazila")}</label>
          <select id="upazilaId" name="upazilaId" className="input rounded-[3px]" value={upazila} onChange={(e) => setUpazila(e.target.value)}>
            {areas.filter((a) => a.kind === "upazila").map((a) => (<option key={a.id} value={a.id}>{a.label}</option>))}
          </select>
        </div>
        <div>
          <label htmlFor="unionId" className="label">{t("union")}</label>
          <select key={upazila} id="unionId" name="unionId" className="input rounded-[3px]" defaultValue={upazila === upazilaId ? unionId : ""}>
            <option value="">{t("select")}</option>
            {unions.map((a) => (<option key={a.id} value={a.id}>{a.label}</option>))}
          </select>
          <FieldError state={state} name="unionId" />
        </div>
      </div>
      <FormAlert state={state} />
      {state?.ok && <FormSuccess>{t("saved")}</FormSuccess>}
      <SubmitButton className="rounded-[3px] font-medium">{t("save_changes")}</SubmitButton>
    </form>
  );
}

export function VerificationSection({ email, emailVerified, phone, phoneVerified, emailEnabled, smsEnabled }: { email: string; emailVerified: boolean; phone: string | null; phoneVerified: boolean; emailEnabled: boolean; smsEnabled: boolean }) {
  const { t } = useI18n();
  const errorText = useErrorText();
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const [sendErr, setSendErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [emailState, emailAction] = useFormState(verifyEmail, null);
  const [phoneStartState, phoneStart] = useFormState(startPhoneVerification, null);
  const [phoneConfirmState, phoneConfirm] = useFormState(confirmPhoneVerification, null);

  useEffect(() => {
    if (emailState?.ok || phoneConfirmState?.ok) router.refresh();
  }, [emailState, phoneConfirmState, router]);

  const row = "flex flex-col gap-3 rounded-[3px] border border-line bg-raised p-4";
  const badge = (text: string, tone: "ok" | "beta" | "muted") => (
    <span
      className={cn(
        "inline-flex items-center rounded-[2px] border px-2 py-0.5 text-xs font-medium",
        tone === "ok" ? "border-ok/40 text-ok" : "border-line text-muted"
      )}
    >
      {text}
    </span>
  );

  return (
    <div className="space-y-3">
      {/* Email */}
      <div className={row}>
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2.5 text-sm font-semibold"><Mail className="h-[18px] w-[18px] text-brand" aria-hidden="true" />{t("email")}</span>
          {emailVerified ? badge(t("verified"), "ok") : badge(t("not_verified"), "muted")}
        </div>
        <p className="text-sm text-muted">{email}</p>
        {!emailVerified && (emailEnabled ? (
          <>
            <button type="button" className="btn-secondary btn-sm self-start rounded-[3px] font-medium" disabled={pending} onClick={() => start(async () => { setSendErr(null); const r = await sendEmailVerification(); if (r.ok) setSent(true); else setSendErr(errorText(r.code, r.retryAfterSec)); })}>
              {sent ? t("resend_code") : t("send_code")}
            </button>
            {sendErr && <p role="alert" className="field-error !mt-0">{sendErr}</p>}
            {sent && (
              <form action={emailAction} className="flex flex-wrap items-start gap-2">
                <input name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required placeholder="123456" aria-label={t("six_digit_code")} className="input rounded-[3px] !w-36 tracking-[0.3em]" />
                <SubmitButton className="btn-sm rounded-[3px] font-medium">{t("verify")}</SubmitButton>
                <FormAlert state={emailState} />
              </form>
            )}
          </>
        ) : (
          <p className="text-xs text-faint">{t("email_not_configured_note")}</p>
        ))}
      </div>

      {/* Mobile (beta) */}
      <div className={row}>
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2.5 text-sm font-semibold"><Smartphone className="h-[18px] w-[18px] text-brand" aria-hidden="true" />{t("mobile_number")}</span>
          {phoneVerified ? badge(t("verified"), "ok") : badge(t("beta"), "beta")}
        </div>
        {phoneVerified ? (
          <p className="text-sm text-muted">{phone}</p>
        ) : smsEnabled ? (
          <>
            <form action={phoneStart} className="flex flex-wrap items-start gap-2">
              <input name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" aria-label={t("mobile_number")} className="input rounded-[3px] !w-52" />
              <SubmitButton variant="secondary" className="btn-sm rounded-[3px] font-medium">{t("send_code")}</SubmitButton>
            </form>
            <FieldError state={phoneStartState} name="phone" />
            <FormAlert state={phoneStartState} />
            {phoneStartState?.ok && (
              <form action={phoneConfirm} className="flex flex-wrap items-start gap-2">
                <input name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required placeholder="123456" aria-label={t("six_digit_code")} className="input rounded-[3px] !w-36 tracking-[0.3em]" />
                <SubmitButton className="btn-sm rounded-[3px] font-medium">{t("verify")}</SubmitButton>
                <FormAlert state={phoneConfirmState} />
              </form>
            )}
          </>
        ) : (
          <p className="text-sm text-muted">{t("mobile_beta_note")}</p>
        )}
      </div>

      {/* NID (beta, never collected until an authorised provider exists) */}
      <div className={row}>
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2.5 text-sm font-semibold"><Fingerprint className="h-[18px] w-[18px] text-brand" aria-hidden="true" />{t("nid")}</span>
          {badge(t("beta"), "beta")}
        </div>
        <p className="text-sm text-muted">{t("nid_beta_note")}</p>
      </div>
    </div>
  );
}

export function PasswordForm() {
  const { t } = useI18n();
  const [state, action] = useFormState(changePassword, null);
  return (
    <form action={action} className="space-y-4" noValidate>
      <div>
        <label htmlFor="current" className="label">{t("current_password")}</label>
        <input id="current" name="current" type="password" autoComplete="current-password" required className="input rounded-[3px]" />
        <FieldError state={state} name="current" />
      </div>
      <div>
        <label htmlFor="new-password" className="label">{t("new_password")}</label>
        <input id="new-password" name="password" type="password" autoComplete="new-password" required minLength={LIMITS.passwordMin} className="input rounded-[3px]" />
        <p className="hint">{t("password_hint", { n: LIMITS.passwordMin })}</p>
        <FieldError state={state} name="password" />
      </div>
      <FormAlert state={state} />
      {state?.ok && <FormSuccess>{t("password_changed")}</FormSuccess>}
      <SubmitButton variant="secondary" className="rounded-[3px] font-medium">{t("change_password")}</SubmitButton>
    </form>
  );
}

export function SignOutEverywhere() {
  const { t } = useI18n();
  return (
    <form action={logoutEverywhere}>
      <SubmitButton variant="secondary" className="rounded-[3px] font-medium">{t("sign_out_everywhere")}</SubmitButton>
    </form>
  );
}

export function DeleteAccountForm() {
  const { t } = useI18n();
  const [state, action] = useFormState(deleteAccount, null);
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" className="btn-danger btn-sm rounded-[3px] font-medium" onClick={() => setOpen(true)}>
        {t("delete_account")}
      </button>
    );
  }
  return (
    <form action={action} className="space-y-3 rounded-[4px] border border-danger/40 bg-danger/5 p-4" noValidate>
      <p className="text-sm text-muted">{t("delete_account_warning")}</p>
      <div>
        <label htmlFor="del-password" className="label">{t("confirm_with_password")}</label>
        <input id="del-password" name="password" type="password" autoComplete="current-password" required className="input rounded-[3px]" />
        <FieldError state={state} name="password" />
      </div>
      <FormAlert state={state} />
      <div className="flex gap-2">
        <SubmitButton variant="danger" className="rounded-[3px] font-medium">{t("delete_account_confirm")}</SubmitButton>
        <button type="button" className="btn-ghost btn-sm rounded-[3px] font-medium" onClick={() => setOpen(false)}>{t("cancel")}</button>
      </div>
    </form>
  );
}
