import Link from "next/link";
import { SiteBackground } from "@/components/site-background";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import type { LegalPage } from "@/content/legal";
import type { Dictionary, Locale } from "@/i18n";

export function LegalPageView({ page, locale, t }: { page: LegalPage; locale: Locale; t: Dictionary }) {
  return (
    <div className="relative overflow-hidden">
      <SiteBackground focus="center" />
      <div className="relative">
        <SiteHeader locale={locale} t={t} />
        <article className="relative z-10 mx-auto max-w-3xl px-4 pb-20 pt-6">
          <Link href={`/${locale}/`} className="text-sm text-silver-dim hover:text-silver">← {t.legal.back}</Link>
          <div className="mt-6 rounded-3xl border border-line bg-panel/90 p-6 backdrop-blur-sm sm:p-10">
            <h1 className="font-display text-3xl text-white sm:text-4xl">{page.title}</h1>
            {t.legal.germanOnly && <p className="mt-3 text-sm text-silver-dim">{t.legal.germanOnly}</p>}
            <div className="mt-8 space-y-8">
              {page.sections.map((s) => (
                <section key={s.heading}>
                  <h2 className="text-sm uppercase tracking-widest text-olive">{s.heading}</h2>
                  {s.paragraphs.map((p, i) => (
                    <p key={i} className="mt-3 whitespace-pre-line text-sm leading-relaxed text-silver">{p}</p>
                  ))}
                </section>
              ))}
            </div>
          </div>
        </article>
        <SiteFooter locale={locale} t={t} />
      </div>
    </div>
  );
}
