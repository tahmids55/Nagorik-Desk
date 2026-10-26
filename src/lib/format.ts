import type { Lang } from "./constants";

const TZ = "Asia/Dhaka";
const locale = (lang: Lang) => (lang === "bn" ? "bn-BD" : "en-GB");

export function formatDate(d: Date | string, lang: Lang): string {
  return new Intl.DateTimeFormat(locale(lang), { timeZone: TZ, day: "numeric", month: "short", year: "numeric" }).format(new Date(d));
}

export function formatDateTime(d: Date | string, lang: Lang): string {
  return new Intl.DateTimeFormat(locale(lang), {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(d));
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

/** "5 minutes ago" in the active language. */
export function timeAgo(d: Date | string, lang: Lang, now = Date.now()): string {
  const seconds = Math.round((new Date(d).getTime() - now) / 1000);
  const rtf = new Intl.RelativeTimeFormat(lang === "bn" ? "bn-BD" : "en", { numeric: "auto" });
  const abs = Math.abs(seconds);
  for (const [unit, size] of UNITS) {
    if (abs >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return rtf.format(0, "second");
}

/** Whole days between now and `due` (negative = overdue). */
export function daysUntil(due: Date | string, now = Date.now()): number {
  return Math.ceil((new Date(due).getTime() - now) / 86_400_000);
}
