"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { builtInPortfolio, imageSrc, usePortfolioItem, type PortfolioItem } from "@/lib/site-content";
import type { Dictionary, Locale } from "@/i18n";

// Project detail; content comes from the admin panel.
export function ProjectView({
  locale,
  t,
  slug,
  initial,
}: {
  locale: Locale;
  t: Dictionary;
  slug: string | null;
  initial?: PortfolioItem;
}) {
  const project = usePortfolioItem(slug, initial);

  return (
    <article className="relative z-10 mx-auto max-w-7xl px-4 pb-20 pt-6">
      <Link href={`/${locale}/#works`} className="text-sm text-silver-dim hover:text-silver">← {t.project.back}</Link>
      {project === null && <p className="mt-10 text-silver-dim">{t.project.notFound}</p>}
      {project && (
        <>
          <div className="mt-6 grid gap-10 lg:grid-cols-[3fr_2fr]">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-panel-2">
              {project.cover && (
                <Image src={imageSrc(project.cover)} alt={project.title} fill priority className="text-transparent object-cover" />
              )}
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-olive">{project.city}</p>
              <h1 className="mt-3 font-display text-4xl text-white">{project.title}</h1>
              <p className="mt-5 text-silver-dim">{project.summary}</p>
              <dl className="mt-8 grid grid-cols-2 gap-4 text-sm">
                <div className="rounded-xl border border-line bg-panel p-4">
                  <dt className="text-silver-dim">{t.project.area}</dt>
                  <dd className="mt-1 font-display text-xl text-white">{project.area}</dd>
                </div>
                <div className="rounded-xl border border-line bg-panel p-4">
                  <dt className="text-silver-dim">{t.project.client}</dt>
                  <dd className="mt-1 text-white">{project.client}</dd>
                </div>
              </dl>
              <h2 className="mt-8 text-sm uppercase tracking-widest text-olive">{t.project.services}</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {project.services.map((s) => (
                  <li key={s} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {project.gallery.length > 0 && (
            <section className="mt-14">
              <h2 className="font-display text-2xl text-white">{t.project.gallery}</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {project.gallery.map((src) => (
                  <div key={src} className="relative aspect-[4/3] overflow-hidden rounded-xl border border-line bg-panel-2">
                    <Image src={imageSrc(src)} alt="" fill className="text-transparent object-cover" />
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </article>
  );
}

// Projects added in the admin panel have no pre-built page; they open
// at /projekte/ansicht/?slug=<slug>.
export function ProjectViewFromQuery({ locale, t }: { locale: Locale; t: Dictionary }) {
  const slug = useSearchParams().get("slug");
  return <ProjectView locale={locale} t={t} slug={slug} initial={builtInPortfolio.find((p) => p.slug === slug)} />;
}
