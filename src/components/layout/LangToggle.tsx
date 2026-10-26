"use client";

import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useI18n } from "@/i18n/client";
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
      className={variant === "icon" ? "btn-ghost btn-sm !px-2.5 font-medium rounded-[3px]" : "flex w-full items-center gap-3 rounded-[3px] px-3 py-2 text-left text-sm font-medium hover:bg-neutral-fill"}
      aria-label={t("switch_language")}
    >
      <Languages className="h-[18px] w-[18px]" aria-hidden="true" />
      <span className={variant === "icon" ? "text-[13px] font-medium" : ""}>{next === "bn" ? "বাংলা" : "English"}</span>
    </button>
  );
}
