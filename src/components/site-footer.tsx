import Link from "next/link";
import type { Dictionary, Locale } from "@/i18n";
import { company } from "@/content/company";

export function SiteFooter({ locale, t }: { locale: Locale; t: Dictionary }) {
  return (
    <footer className="relative z-10 border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-3">
        <div>
          <h2 className="font-display text-2xl text-white">{t.home.contactTitle}</h2>
          <p className="mt-2 text-sm text-silver-dim">{t.home.contactText}</p>
        </div>
        <div className="space-y-1 text-sm">
          <div className="text-xs uppercase tracking-widest text-olive">{t.home.contactPerson}</div>
          <div className="text-white">{company.contactPerson}</div>
          <a href={`tel:${company.phone.replace(/\s/g, "")}`} className="block hover:text-white">{company.phone}</a>
          <a href={`mailto:${company.email}`} className="block hover:text-white">{company.email}</a>
          <a href={company.linkedin} className="block text-silver-dim hover:text-white" target="_blank" rel="noreferrer">
            LinkedIn
          </a>
        </div>
        <div className="space-y-3 text-sm">
          <div className="text-xs uppercase tracking-widest text-olive">{t.home.locations}</div>
          {company.locations.map((l) => (
            <div key={l.city}>
              <div className="text-white">{l.city}</div>
              <div className="text-silver-dim">{l.street}, {l.zip} {l.city}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-silver-dim sm:flex-row">
          <span>© {new Date().getFullYear()} {company.name}</span>
          <nav className="flex gap-6">
            <Link href={`/${locale}/impressum/`} className="hover:text-white">{t.legal.imprint}</Link>
            <Link href={`/${locale}/datenschutz/`} className="hover:text-white">{t.legal.privacy}</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
