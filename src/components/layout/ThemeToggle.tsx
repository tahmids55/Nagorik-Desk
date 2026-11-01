"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/cn";

type Theme = "light" | "dark";
type Mode = Theme | "system";

const COOKIE = "theme";

const systemTheme = (): Theme => (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

/** Applies a choice instantly; "system" forgets the saved choice and follows the device again. */
function applyMode(mode: Mode) {
  document.documentElement.dataset.theme = mode === "system" ? systemTheme() : mode;
  document.cookie = mode === "system" ? `${COOKIE}=; path=/; max-age=0; SameSite=Lax` : `${COOKIE}=${mode}; path=/; max-age=${365 * 86_400}; SameSite=Lax`;
}

const savedMode = (): Mode => {
  const m = /(?:^|;\s*)theme=(light|dark)/.exec(document.cookie);
  return (m?.[1] as Theme | undefined) ?? "system";
};

/** Flips between the light and dark theme. Applies instantly, stores a one-year cookie, then refreshes server output. */
export function ThemeToggle({ variant = "icon", className }: { variant?: "icon" | "row"; className?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();

  function flip() {
    applyMode(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
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
        className,
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

/** Settings: follow the device, or always light / always dark. */
export function ThemeChooser() {
  const { t } = useI18n();
  const router = useRouter();
  const [mode, setMode] = useState<Mode | null>(null);
  const [, start] = useTransition();

  useEffect(() => setMode(savedMode()), []);

  // While following the device, react to the device switching (e.g. at sunset).
  useEffect(() => {
    if (mode !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyMode("system");
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [mode]);

  const choose = (m: Mode) => {
    setMode(m);
    applyMode(m);
    start(() => router.refresh());
  };

  const options: { value: Mode; label: string; icon: typeof Sun }[] = [
    { value: "system", label: t("theme_system"), icon: Monitor },
    { value: "light", label: t("theme_light"), icon: Sun },
    { value: "dark", label: t("theme_dark"), icon: Moon },
  ];

  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t("settings_appearance")}>
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={mode === value}
          onClick={() => choose(value)}
          className={cn(
            "flex min-h-[64px] flex-col items-center justify-center gap-1.5 rounded-[3px] border px-2 py-2.5 text-center text-xs font-medium transition-colors sm:text-[13px]",
            mode === value ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-muted hover:border-brand/50 hover:text-ink",
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          <span className="leading-tight">{label}</span>
        </button>
      ))}
    </div>
  );
}
