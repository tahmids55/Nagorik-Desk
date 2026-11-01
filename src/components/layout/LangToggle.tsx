"use client";

import { Check, Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/cn";
import { setLanguage } from "@/server/actions/auth";

export function LangToggle({ variant = "icon" }: { variant?: "icon" | "row" }) {
  const { lang, t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const next = lang === "en" ? "bn" : "en";
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await setLanguage(next);
          router.refresh();
        })
      }
      className={variant === "icon" ? "btn-ghost btn-sm !px-2 font-medium rounded-[3px] min-h-[40px] sm:min-h-[34px] flex items-center gap-1.5" : "flex w-full items-center gap-3 rounded-[3px] px-3 py-2 text-left text-sm font-medium hover:bg-neutral-fill"}
      aria-label={t("switch_language")}
    >
      <Languages className="h-[18px] w-[18px]" aria-hidden="true" />
      <span className={variant === "icon" ? "hidden sm:inline text-[13px] font-medium" : ""}>{next === "bn" ? "বাংলা" : "English"}</span>
    </button>
  );
}

/** Settings: both languages side by side, the current one selected. */
export function LangChooser() {
  const { lang, t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const options = [
    { value: "bn", label: "বাংলা" },
    { value: "en", label: "English" },
  ] as const;
  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t("switch_language")}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={lang === o.value}
          disabled={pending}
          lang={o.value}
          onClick={() =>
            lang !== o.value &&
            start(async () => {
              await setLanguage(o.value);
              router.refresh();
            })
          }
          className={cn(
            "flex min-h-[48px] items-center justify-center gap-2 rounded-[3px] border px-3 text-sm font-medium transition-colors disabled:opacity-60",
            lang === o.value ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-muted hover:border-brand/50 hover:text-ink",
          )}
        >
          {lang === o.value && <Check className="h-4 w-4" aria-hidden="true" />}
          {o.label}
        </button>
      ))}
    </div>
  );
}
