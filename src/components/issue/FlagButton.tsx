"use client";

import { Flag } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { FormAlert, FormSuccess, SubmitButton } from "@/components/ui/forms";
import { useI18n } from "@/i18n/client";
import { FLAG_REASONS } from "@/lib/constants";
import type { TKey } from "@/i18n/translate";
import { flagContent } from "@/server/actions/issues";

export function FlagButton({ targetType, targetId, signedIn, compact = false }: { targetType: "issue" | "comment"; targetId: string; signedIn: boolean; compact?: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [state, action] = useFormState(flagContent, null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className={compact ? "inline-flex items-center gap-1 text-xs text-faint hover:text-ink rounded-[3px]" : "btn-ghost btn-sm rounded-[3px]"}
        onClick={() => (signedIn ? setOpen((v) => !v) : router.push(`/login?next=${encodeURIComponent(pathname)}`))}
        aria-expanded={open}
        aria-label={t("flag_report")}
      >
        <Flag className="h-4 w-4" aria-hidden="true" />
        {!compact && <span className="hidden sm:inline">{t("flag_report")}</span>}
      </button>
      {open && (
        <div className="rounded-[4px] border border-line bg-surface shadow-popover absolute bottom-full right-0 z-30 mb-2 w-72 p-4">
          {state?.ok ? (
            <FormSuccess>{t("flag_thanks")}</FormSuccess>
          ) : (
            <form action={action} className="space-y-3">
              <input type="hidden" name="targetType" value={targetType} />
              <input type="hidden" name="targetId" value={targetId} />
              <p className="text-sm font-semibold">{t("flag_title")}</p>
              <fieldset className="space-y-1.5">
                {FLAG_REASONS.map((r, i) => (
                  <label key={r} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input type="radio" name="reason" value={r} defaultChecked={i === 0} className="accent-brand" />
                    {t(`flag_reason_${r}` as TKey)}
                  </label>
                ))}
              </fieldset>
              <FormAlert state={state} />
              <SubmitButton className="btn-sm w-full rounded-[3px]">{t("flag_submit")}</SubmitButton>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
