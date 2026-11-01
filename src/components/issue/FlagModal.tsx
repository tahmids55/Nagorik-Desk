"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useFormState } from "react-dom";
import { Dialog } from "@/components/ui/Dialog";
import { FormAlert, FormSuccess, SubmitButton } from "@/components/ui/forms";
import { useI18n } from "@/i18n/client";
import { FLAG_REASONS } from "@/lib/constants";
import type { TKey } from "@/i18n/translate";
import { flagContent } from "@/server/actions/issues";

/** "Why are you reporting this?" for a post or a comment. Signed-out visitors are sent to sign in. */
export function FlagModal({
  targetType,
  targetId,
  signedIn,
  onClose,
}: {
  targetType: "issue" | "comment";
  targetId: string;
  signedIn: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [state, action] = useFormState(flagContent, null);

  useEffect(() => {
    if (!signedIn) router.push(`/login?next=${encodeURIComponent(pathname)}`);
  }, [signedIn, router, pathname]);

  if (!signedIn) return null;

  return (
    <Dialog open onClose={onClose} title={t("flag_title")}>
      <div className="px-4 pb-4 sm:px-5 sm:pb-5">
        {state?.ok ? (
          <div className="space-y-4 pt-2">
            <FormSuccess>{t("flag_thanks")}</FormSuccess>
            <button type="button" onClick={onClose} className="btn-secondary w-full rounded-[3px]">
              {t("close")}
            </button>
          </div>
        ) : (
          <form action={action} className="space-y-4 pt-1">
            <input type="hidden" name="targetType" value={targetType} />
            <input type="hidden" name="targetId" value={targetId} />
            <fieldset className="space-y-1">
              <legend className="sr-only">{t("flag_title")}</legend>
              {FLAG_REASONS.map((r, i) => (
                <label key={r} className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-[3px] px-2 text-sm hover:bg-neutral-fill sm:min-h-[36px]">
                  <input type="radio" name="reason" value={r} defaultChecked={i === 0} className="h-4 w-4 accent-brand" />
                  <span>{t(`flag_reason_${r}` as TKey)}</span>
                </label>
              ))}
            </fieldset>
            <FormAlert state={state} />
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="btn-ghost flex-1 rounded-[3px]">
                {t("cancel")}
              </button>
              <SubmitButton className="flex-1 rounded-[3px]">{t("flag_submit")}</SubmitButton>
            </div>
          </form>
        )}
      </div>
    </Dialog>
  );
}
