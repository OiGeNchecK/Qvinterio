"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOCALES, localeLabel } from "@/i18n";

// Swaps the first path segment (/de/... ↔ /en/...).
export function LocaleSwitcher() {
  const pathname = usePathname();
  const [, current, ...rest] = pathname.split("/");
  return (
    <div className="flex rounded-full border border-line p-0.5 text-xs">
      {LOCALES.map((locale) => (
        <Link
          key={locale}
          href={["", locale, ...rest].join("/") || `/${locale}/`}
          aria-current={locale === current ? "true" : undefined}
          className={`rounded-full px-2 py-1 uppercase transition ${
            locale === current ? "bg-olive text-ink" : "text-silver-dim hover:text-silver"
          }`}
        >
          {localeLabel(locale)}
        </Link>
      ))}
    </div>
  );
}
