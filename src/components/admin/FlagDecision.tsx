"use client";

import { ActionForm } from "@/components/staff/ActionForm";
import { FieldError } from "@/components/ui/forms";
import { useI18n } from "@/i18n/client";
import { decideFlag } from "@/server/actions/admin";

export function FlagDecision({ flagId, alreadyHidden }: { flagId: string; alreadyHidden: boolean }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-start gap-3">
      <ActionForm action={decideFlag} submit={t("dismiss_flag")} variant="secondary" className="contents">
        <input type="hidden" name="flagId" value={flagId} />
        <input type="hidden" name="decision" value="dismiss" />
      </ActionForm>
      {!alreadyHidden && (
        <ActionForm action={decideFlag} submit={t("hide_content")} variant="danger" className="flex flex-1 flex-wrap items-start gap-2">
          {(state) => (
            <>
              <input type="hidden" name="flagId" value={flagId} />
              <input type="hidden" name="decision" value="hide" />
              <div className="min-w-[220px] flex-1">
                <input name="reason" required maxLength={300} className="input rounded-[3px] !py-1.5 text-sm" placeholder={t("hide_reason_ph")} aria-label={t("hide_reason_ph")} />
                <FieldError state={state} name="reason" />
              </div>
            </>
          )}
        </ActionForm>
      )}
    </div>
  );
}
