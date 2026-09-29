import type { Locale } from "@seo-master/seo-rules";

/** Client-safe (no next/headers): BCP 47 tags for Intl formatters. */
export const INTL_LOCALE: Record<Locale, string> = { pl: "pl-PL", en: "en-GB" };
