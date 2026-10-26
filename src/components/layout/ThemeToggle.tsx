"use client";

import { Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/cn";

type Theme = "light" | "dark";

/** Flips between the light and dark theme. Applies instantly, stores a one-year cookie, then refreshes server output. */
export function ThemeToggle({ variant = "icon", className }: { variant?: "icon" | "row"; className?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();

  function flip() {
    const current: Theme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    const next: Theme = current === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    document.cookie = `theme=${next}; path=/; max-age=${365 * 86_400}; SameSite=Lax`;
    start(() => router.refresh());
  }

  const label = t("switch_theme");
  return (
    <button
      type="button"
      onClick={flip}
      disabled={pending}
      aria-label={label}
      title={label}
      className={cn(
        variant === "icon"
          ? "btn-ghost btn-sm !px-2.5 rounded-[3px]"
          : "flex w-full items-center gap-3 rounded-[3px] px-3 py-2 text-left text-sm font-medium hover:bg-neutral-fill",
        className
      )}
    >
      {/* Both icons render; CSS shows the one for the target theme so the server markup never mismatches. */}
      <Moon className="h-[18px] w-[18px] [[data-theme='dark']_&]:hidden" strokeWidth={1.5} aria-hidden="true" />
      <Sun className="hidden h-[18px] w-[18px] [[data-theme='dark']_&]:block" strokeWidth={1.5} aria-hidden="true" />
      {variant === "row" && (
        <>
          <span className="[[data-theme='dark']_&]:hidden">{t("theme_dark")}</span>
          <span className="hidden [[data-theme='dark']_&]:inline">{t("theme_light")}</span>
        </>
      )}
    </button>
  );
}
