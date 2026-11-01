"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/cn";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible modal. `sheet` slides up from the bottom on phones and is a centred dialog from `sm` up;
 * `center` is a centred dialog everywhere. Focus is trapped inside and returned to the trigger on close,
 * and Escape closes only the top-most dialog.
 */
export function Dialog({
  open,
  onClose,
  title,
  label,
  variant = "sheet",
  size = "sm",
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  /** Visible heading (also the accessible name). */
  title?: ReactNode;
  /** Accessible name when there is no visible title. */
  label?: string;
  variant?: "sheet" | "center";
  size?: "sm" | "md";
  children: ReactNode;
  className?: string;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    // Focus the panel itself, so phones don't pop the keyboard open for a text field.
    const id = requestAnimationFrame(() => panel.current?.focus());
    return () => {
      cancelAnimationFrame(id);
      if (previous && document.contains(previous)) previous.focus({ preventScroll: true });
    };
  }, [open]);

  if (!open || !mounted) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !panel.current) return;
    const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
    if (items.length === 0) return e.preventDefault();
    const first = items[0]!;
    const last = items[items.length - 1]!;
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === panel.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const sheet = variant === "sheet";
  return createPortal(
    <div className={cn("fixed inset-0 z-[60] flex justify-center", sheet ? "items-end sm:items-center sm:p-4" : "items-center p-4")} role="presentation">
      <div className="absolute inset-0 animate-fade-in bg-black/45" onClick={onClose} aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : label}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={cn(
          "relative z-10 flex max-h-[88dvh] w-full flex-col overflow-hidden border border-line bg-surface shadow-popover focus:outline-none",
          size === "md" ? "sm:max-w-md" : "sm:max-w-sm",
          sheet
            ? "animate-sheet-up rounded-t-[6px] pb-[env(safe-area-inset-bottom)] sm:animate-pop-in sm:rounded-[4px] sm:pb-0"
            : "max-w-sm animate-pop-in rounded-[4px]",
          className,
        )}
      >
        {sheet && <span className="mx-auto mt-2 block h-1 w-9 shrink-0 rounded-[2px] bg-line-strong sm:hidden" aria-hidden="true" />}
        {title && (
          <div className="flex shrink-0 items-start justify-between gap-3 px-4 pb-1 pt-3 sm:px-5 sm:pt-4">
            <h2 id={titleId} className="text-[15px] font-semibold leading-snug">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="-mr-1.5 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] text-muted hover:bg-neutral-fill hover:text-ink"
              aria-label={t("close")}
            >
              <X className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>
          </div>
        )}
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

/** Bottom-sheet / dropdown menu row with a consistent touch size. */
export const menuItemClass =
  "flex w-full items-center gap-3 rounded-[3px] px-3 py-2.5 text-left text-sm font-medium text-ink transition-colors hover:bg-neutral-fill focus-visible:bg-neutral-fill focus-visible:outline-none sm:py-2 sm:text-[13px]";
