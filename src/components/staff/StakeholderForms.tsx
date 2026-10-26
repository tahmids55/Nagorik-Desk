"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { FieldError } from "@/components/ui/forms";
import { useI18n } from "@/i18n/client";
import type { TKey } from "@/i18n/translate";
import { appointAuthority, revokeAuthority, saveStakeholder, setStakeholderActive } from "@/server/actions/staff";
import { ActionForm } from "./ActionForm";

export const KINDS = ["government", "local_government", "utility", "public_service", "other"] as const;

export type StakeholderValue = { id?: string; nameEn?: string; nameBn?: string | null; kind?: string; upazilaId?: string | null; phone?: string | null; email?: string | null };
export type UpazilaOpt = { id: string; name: string };

export function StakeholderForm({ value = {}, upazilas, submit }: { value?: StakeholderValue; upazilas: UpazilaOpt[]; submit: string }) {
  const { t } = useI18n();
  const isNew = !value.id;
  return (
    <ActionForm action={saveStakeholder} submit={submit} variant={value.id ? "secondary" : "primary"} resetOnSuccess={isNew}>
      {(state) => (
        <>
          {value.id && <input type="hidden" name="id" value={value.id} />}
          <div>
            <label className="label">{t("office_name_en")}</label>
            <input name="nameEn" required defaultValue={value.nameEn} maxLength={120} className="input rounded-[3px]" placeholder="e.g. LGED, Panchagarh Sadar" />
            <FieldError state={state} name="nameEn" />
          </div>
          <div>
            <label className="label">{t("office_name_bn")} <span className="font-normal text-faint">({t("optional")})</span></label>
            <input name="nameBn" defaultValue={value.nameBn ?? ""} maxLength={120} className="input rounded-[3px]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{t("office_kind")}</label>
              <select name="kind" defaultValue={value.kind ?? "government"} className="input rounded-[3px]">
                {KINDS.map((k) => (<option key={k} value={k}>{t(`kind_${k}` as TKey)}</option>))}
              </select>
            </div>
            <div>
              <label className="label">{t("office_covers")}</label>
              <select name="upazilaId" defaultValue={value.upazilaId ?? ""} className="input rounded-[3px]">
                <option value="">{t("whole_constituency")}</option>
                {upazilas.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{t("office_phone")}</label>
              <input name="phone" defaultValue={value.phone ?? ""} className="input rounded-[3px]" inputMode="tel" />
              <FieldError state={state} name="phone" />
            </div>
            <div>
              <label className="label">{t("office_email")}</label>
              <input name="email" type="email" defaultValue={value.email ?? ""} className="input rounded-[3px]" />
              <FieldError state={state} name="email" />
            </div>
          </div>
        </>
      )}
    </ActionForm>
  );
}

export function AppointForm({ offices }: { offices: { id: string; name: string }[] }) {
  const { t } = useI18n();
  return (
    <ActionForm action={appointAuthority} submit={t("appoint_btn")} variant="secondary" successText={t("appointed_ok")} resetOnSuccess>
      {(state) => (
        <>
          <div>
            <label className="label" htmlFor="ap-email">{t("officer_email")}</label>
            <input id="ap-email" name="email" type="email" required className="input rounded-[3px]" />
            <p className="hint">{t("officer_email_hint")}</p>
            <FieldError state={state} name="email" />
          </div>
          <div>
            <label className="label" htmlFor="ap-office">{t("responsible_office")}</label>
            <select id="ap-office" name="stakeholderId" required className="input rounded-[3px]">
              <option value="">{t("select")}</option>
              {offices.map((o) => (<option key={o.id} value={o.id}>{o.name}</option>))}
            </select>
            <FieldError state={state} name="stakeholderId" />
          </div>
          <div>
            <label className="label" htmlFor="ap-title">{t("officer_title")} <span className="font-normal text-faint">({t("optional")})</span></label>
            <input id="ap-title" name="officeTitle" maxLength={80} className="input rounded-[3px]" placeholder={t("officer_title_ph")} />
          </div>
        </>
      )}
    </ActionForm>
  );
}

export function ToggleActive({ id, active }: { id: string; active: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} className="btn-ghost btn-sm rounded-[3px] font-medium" onClick={() => start(async () => { await setStakeholderActive(id, !active); router.refresh(); })}>
      {active ? t("deactivate") : t("activate")}
    </button>
  );
}

export function RevokeButton({ userId }: { userId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} className="btn-ghost btn-sm rounded-[3px] font-medium text-danger" onClick={() => confirm(t("confirm_revoke")) && start(async () => { await revokeAuthority(userId); router.refresh(); })}>
      {t("revoke")}
    </button>
  );
}
