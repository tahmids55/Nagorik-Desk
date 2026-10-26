"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useFormState } from "react-dom";
import { FormAlert, FormSuccess, SubmitButton } from "@/components/ui/forms";
import { useI18n } from "@/i18n/client";
import type { ActionResult } from "@/lib/action";

type Action = (prev: ActionResult | null, formData: FormData) => Promise<ActionResult | null>;

/**
 * A small form wired to a server action: shows the error / success state and refreshes the page data on success.
 * `children` can be a function to render per-field errors from the latest state.
 */
export function ActionForm({
  action,
  children,
  submit,
  variant = "secondary",
  className,
  successText,
  resetOnSuccess = false,
}: {
  action: Action;
  children: ReactNode | ((state: ActionResult | null) => ReactNode);
  submit: string;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
  successText?: string;
  resetOnSuccess?: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [state, formAction] = useFormState(action, null);

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  return (
    <form
      action={formAction}
      className={className ?? "space-y-3"}
      ref={(el) => {
        if (el && resetOnSuccess && state?.ok) el.reset();
      }}
    >
      {typeof children === "function" ? children(state) : children}
      <FormAlert state={state} />
      {state?.ok && <FormSuccess>{successText ?? t("saved")}</FormSuccess>}
      <SubmitButton variant={variant} className="btn-sm rounded-[3px] font-medium">
        {submit}
      </SubmitButton>
    </form>
  );
}
