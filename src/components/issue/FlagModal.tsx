"use client";

import { X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useFormState } from "react-dom";
import { FormAlert, FormSuccess, SubmitButton } from "@/components/ui/forms";
import { useI18n } from "@/i18n/client";
import { FLAG_REASONS } from "@/lib/constants";
import type { TKey } from "@/i18n/translate";
import { flagContent } from "@/server/actions/issues";

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
    if (!signedIn) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [signedIn, router, pathname]);

  if (!signedIn) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("flag_title")}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
    >
      <div className="relative w-full max-w-sm rounded-[4px] border border-line bg-surface p-5 shadow-popover">
        <button
          type="button"
          onClick={onClose}
          aria-label={t("close")}
          className="absolute right-3 top-3 rounded-[3px] p-1 text-muted hover:bg-neutral-fill hover:text-ink"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        {state?.ok ? (
          <div className="space-y-4 pt-2">
            <FormSuccess>{t("flag_thanks")}</FormSuccess>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary btn-sm w-full rounded-[3px]"
            >
              {t("close")}
            </button>
          </div>
        ) : (
          <form action={action} className="space-y-4 pt-1">
            <input type="hidden" name="targetType" value={targetType} />
            <input type="hidden" name="targetId" value={targetId} />
            <p className="text-[15px] font-semibold">{t("flag_title")}</p>
            <fieldset className="space-y-2">
              {FLAG_REASONS.map((r, i) => (
                <label
                  key={r}
                  className="flex cursor-pointer items-center gap-2.5 rounded-[3px] p-1.5 text-sm hover:bg-neutral-fill"
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r}
                    defaultChecked={i === 0}
                    className="accent-brand"
                  />
                  <span>{t(`flag_reason_${r}` as TKey)}</span>
                </label>
              ))}
            </fieldset>
            <FormAlert state={state} />
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="btn-ghost btn-sm flex-1 rounded-[3px]"
              >
                {t("cancel")}
              </button>
              <SubmitButton className="btn-primary btn-sm flex-1 rounded-[3px]">
                {t("flag_submit")}
              </SubmitButton>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
