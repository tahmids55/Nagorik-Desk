import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { LANGS, type Lang } from "@/lib/constants";
import { getSession } from "@/server/auth/session";
import { makeT } from "./translate";

export const LANG_COOKIE = "ngk_lang";

/** Cookie wins, then the signed-in user's saved language, then Accept-Language, then English. */
export const getLang = cache(async (): Promise<Lang> => {
  const c = (await cookies()).get(LANG_COOKIE)?.value;
  if (c && (LANGS as readonly string[]).includes(c)) return c as Lang;
  const s = await getSession().catch(() => null);
  if (s) return s.user.lang;
  const al = (await headers()).get("accept-language")?.toLowerCase() ?? "";
  return al.startsWith("bn") ? "bn" : "en";
});

export async function getT() {
  const lang = await getLang();
  return { lang, ...makeT(lang) };
}
