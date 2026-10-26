"use client";

import { useState } from "react";
import { FieldError } from "@/components/ui/forms";
import { ActionForm } from "@/components/staff/ActionForm";
import { useI18n } from "@/i18n/client";
import { ROLES } from "@/lib/constants";
import type { TKey } from "@/i18n/translate";
import { setUserRole, setUserStatus } from "@/server/actions/admin";

export function RoleForm({ userId, role, stakeholderId, officeTitle, offices }: { userId: string; role: string; stakeholderId: string | null; officeTitle: string | null; offices: { id: string; name: string }[] }) {
  const { t } = useI18n();
  const [selected, setSelected] = useState(role);
  return (
    <ActionForm action={setUserRole} submit={t("save_role")} variant="secondary" successText={t("role_saved")}>
      {(state) => (
        <>
          <input type="hidden" name="userId" value={userId} />
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label">{t("role")}</label>
              <select name="role" className="input rounded-[3px]" value={selected} onChange={(e) => setSelected(e.target.value)}>
                {ROLES.map((r) => (<option key={r} value={r}>{t(`role_${r}` as TKey)}</option>))}
              </select>
            </div>
            {selected === "authority" && (
              <div>
                <label className="label">{t("responsible_office")}</label>
                <select name="stakeholderId" className="input rounded-[3px]" defaultValue={stakeholderId ?? ""} required>
                  <option value="">{t("select")}</option>
                  {offices.map((o) => (<option key={o.id} value={o.id}>{o.name}</option>))}
                </select>
                <FieldError state={state} name="stakeholderId" />
              </div>
            )}
            {selected !== "citizen" && (
              <div>
                <label className="label">{t("officer_title")}</label>
                <input name="officeTitle" defaultValue={officeTitle ?? ""} maxLength={80} className="input rounded-[3px]" />
              </div>
            )}
          </div>
          <p className="hint">{t("role_change_hint")}</p>
        </>
      )}
    </ActionForm>
  );
}

export function StatusForm({ userId, suspended }: { userId: string; suspended: boolean }) {
  const { t } = useI18n();
  return (
    <ActionForm action={setUserStatus} submit={suspended ? t("reactivate") : t("suspend")} variant={suspended ? "secondary" : "danger"}>
      {(state) => (
        <>
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="status" value={suspended ? "active" : "suspended"} />
          {!suspended && (
            <div>
              <label className="label">{t("suspend_reason")}</label>
              <input name="reason" required maxLength={300} className="input rounded-[3px]" />
              <FieldError state={state} name="reason" />
            </div>
          )}
        </>
      )}
    </ActionForm>
  );
}
