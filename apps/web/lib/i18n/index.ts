import type { Locale } from "@seo-master/seo-rules";
import "server-only";
import { cookies, headers } from "next/headers";
import { en, type Dictionary } from "./en";
import { pl } from "./pl";

export const LOCALE_COOKIE = "locale";
const dictionaries: Record<Locale, Dictionary> = { pl, en };

/** Cookie set by the language switcher, else the browser's language (Polish unless it asks for English). */
export async function getLocale(): Promise<Locale> {
  const cookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (cookie === "pl" || cookie === "en") return cookie;
  const accept = (await headers()).get("accept-language") ?? "";
  return /^en\b/i.test(accept) ? "en" : "pl";
}

export async function getT() {
  const locale = await getLocale();
  return { locale, t: dictionaries[locale] };
}

export { INTL_LOCALE } from "./intl";

export type { Dictionary };
