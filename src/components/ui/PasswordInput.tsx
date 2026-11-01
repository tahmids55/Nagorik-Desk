"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/cn";

/** Password field with a show/hide toggle: typing a long password on a phone keyboard is error-prone. */
export function PasswordInput({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={visible ? "text" : "password"} autoCapitalize="none" autoCorrect="off" spellCheck={false} className={cn("input !pr-11", className)} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-[3px] text-muted hover:bg-neutral-fill hover:text-ink"
        aria-label={visible ? t("hide_password") : t("show_password")}
        aria-pressed={visible}
        aria-controls={props.id}
      >
        {visible ? <EyeOff className="h-[18px] w-[18px]" aria-hidden="true" /> : <Eye className="h-[18px] w-[18px]" aria-hidden="true" />}
      </button>
    </div>
  );
}
