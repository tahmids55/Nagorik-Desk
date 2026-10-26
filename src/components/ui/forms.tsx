"use client";

import { Loader2 } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useI18n } from "@/i18n/client";
import { hasKey, type TKey } from "@/i18n/translate";
import { cn } from "@/lib/cn";
import type { ActionResult } from "@/lib/action";

export function SubmitButton({
  children,
  className,
  variant = "primary",
  ...rest
}: { children: ReactNode; variant?: "primary" | "secondary" | "danger" | "ghost" } & ComponentProps<"button">) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      {...rest}
      disabled={pending || rest.disabled}
      className={cn(
        "rounded-[3px] font-medium",
        variant === "primary" ? "btn-primary" : variant === "secondary" ? "btn-secondary" : variant === "danger" ? "btn-danger" : "btn-ghost",
        className
      )}
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

/** Turns a stable server error code into text in the active language. */
export function useErrorText() {
  const { t } = useI18n();
  return (code: string | undefined, retryAfterSec?: number): string => {
    if (!code) return "";
    const key = `err_${code}`;
    const base = hasKey(key) ? t(key as TKey) : t("err_generic");
    if (retryAfterSec && retryAfterSec > 0) {
      const minutes = Math.max(1, Math.ceil(retryAfterSec / 60));
      return `${base} ${t("err_try_again_in", { minutes })}`;
    }
    return base;
  };
}

export function FieldError({ state, name }: { state: ActionResult<unknown> | null; name: string }) {
  const text = useErrorText();
  const code = state && !state.ok ? state.fields?.[name] : undefined;
  if (!code) return null;
  return (
    <p className="field-error" role="alert">
      {text(code)}
    </p>
  );
}

/** Top-of-form error for failures that are not tied to a single field. */
export function FormAlert({ state }: { state: ActionResult<unknown> | null }) {
  const text = useErrorText();
  if (!state || state.ok) return null;
  if (state.code === "validation" && state.fields && Object.keys(state.fields).length > 0) return null;
  return (
    <div role="alert" className="rounded-[3px] border border-danger/40 bg-surface px-3.5 py-2.5 text-sm text-danger">
      {text(state.code, state.retryAfterSec)}
    </div>
  );
}

export function FormSuccess({ children }: { children: ReactNode }) {
  return (
    <div role="status" className="rounded-[3px] border border-ok/40 bg-surface px-3.5 py-2.5 text-sm text-ok">
      {children}
    </div>
  );
}
