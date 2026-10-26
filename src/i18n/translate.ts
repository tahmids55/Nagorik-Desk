import type { Lang } from "@/lib/constants";
import { bn } from "./bn";
import { en, type TKey } from "./en";

export type { TKey };
export type Params = Record<string, string | number>;
export type TFn = (key: TKey, params?: Params) => string;
export type TnFn = (key: string, n: number, params?: Params) => string;

const dicts: Record<Lang, Record<string, string>> = { en, bn };
const enAny = en as Record<string, string>;

function interpolate(text: string, params?: Params): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (_, k: string) => (k in params ? String(params[k]) : `{${k}}`));
}

export function makeT(lang: Lang): { t: TFn; tn: TnFn } {
  const dict = dicts[lang];
  const t: TFn = (key, params) => interpolate(dict[key] ?? enAny[key] ?? key, params);
  /** Plural helper: looks up `<key>_one` / `<key>_other` (Bangla uses `_other` for everything but 1 as well). */
  const tn: TnFn = (key, n, params) => {
    const k = n === 1 ? `${key}_one` : `${key}_other`;
    return interpolate(dict[k] ?? enAny[k] ?? k, { n: formatNumber(n, lang), ...params });
  };
  return { t, tn };
}

export const hasKey = (key: string): key is TKey => key in en;

export function formatNumber(n: number, lang: Lang): string {
  return new Intl.NumberFormat(lang === "bn" ? "bn-BD" : "en-US").format(n);
}
