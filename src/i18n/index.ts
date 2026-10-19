import de from "./de";
import uk from "./uk";

// German is the main language; Ukrainian is temporary and can be dropped
// by removing it from LOCALES and deleting uk.ts.
export const LOCALES = ["de", "uk"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "de";

const dictionaries = { de, uk };

export function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale);
}

export function getDictionary(locale: string) {
  const l = isLocale(locale) ? locale : DEFAULT_LOCALE;
  return { locale: l, t: dictionaries[l] };
}

export function dateLocale(locale: Locale) {
  return locale === "uk" ? "uk-UA" : "de-DE";
}

export type { Dictionary } from "./de";
