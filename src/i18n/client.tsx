"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Lang } from "@/lib/constants";
import { makeT, type TFn, type TnFn } from "./translate";

type Ctx = { lang: Lang; t: TFn; tn: TnFn };
const I18nContext = createContext<Ctx | null>(null);

/** Only the language travels to the browser; messages are bundled with the client code. */
export function I18nProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  const value = useMemo<Ctx>(() => ({ lang, ...makeT(lang) }), [lang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
