import de from "./de";
import uk from "./uk";
import en from "./en";
import pl from "./pl";

// German is the main language; Ukrainian is temporary and can be dropped
// by removing it from LOCALES and deleting uk.ts.
export const LOCALES = ["de", "en", "pl", "uk"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "de";

const dictionaries = { de, en, pl, uk };

export function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale);
}

export function getDictionary(locale: string) {
  const l = isLocale(locale) ? locale : DEFAULT_LOCALE;
  return { locale: l, t: dictionaries[l] };
}

const DATE_LOCALES: Record<Locale, string> = { de: "de-DE", en: "en-GB", pl: "pl-PL", uk: "uk-UA" };

export function dateLocale(locale: Locale) {
  return DATE_LOCALES[locale];
}

// Short label in the language switcher and in the admin translation fields.
export function localeLabel(locale: Locale) {
  return locale === "uk" ? "UA" : locale.toUpperCase();
}

export type { Dictionary } from "./de";
