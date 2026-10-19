import "server-only";
import { cookies } from "next/headers";
import de from "./de";
import uk from "./uk";

// German is the main language; Ukrainian is temporary and can be dropped
// by removing it from LOCALES and deleting uk.ts.
export const LOCALES = ["de", "uk"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "de";
export const LOCALE_COOKIE = "locale";

const dictionaries = { de, uk };

export function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale);
}

export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function getDictionary() {
  const locale = await getLocale();
  return { locale, t: dictionaries[locale] };
}
