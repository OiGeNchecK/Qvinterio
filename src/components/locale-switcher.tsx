import { getLocale, LOCALES } from "@/i18n";
import { setLocale } from "@/i18n/actions";

export async function LocaleSwitcher() {
  const current = await getLocale();
  return (
    <form action={setLocale} className="flex rounded-full border border-line p-0.5 text-xs">
      {LOCALES.map((locale) => (
        <button
          key={locale}
          name="locale"
          value={locale}
          aria-pressed={locale === current}
          className={`rounded-full px-2.5 py-1 uppercase transition ${
            locale === current ? "bg-olive text-ink" : "text-silver-dim hover:text-silver"
          }`}
        >
          {locale === "uk" ? "UA" : locale}
        </button>
      ))}
    </form>
  );
}
