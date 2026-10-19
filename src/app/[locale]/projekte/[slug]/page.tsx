import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getDictionary } from "@/i18n";
import { getProject, projects } from "@/content/projects";

export const dynamicParams = false;

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/projekte/[slug]">): Promise<Metadata> {
  const project = getProject((await params).slug);
  return project ? { title: `${project.city}, ${project.title} – Qvinterio`, description: project.summary } : {};
}

export default async function ProjectPage({ params }: PageProps<"/[locale]/projekte/[slug]">) {
  const { slug, locale: l } = await params;
  const project = getProject(slug);
  if (!project) notFound();
  const { locale, t } = getDictionary(l);

  return (
    <div className="relative overflow-hidden">
      <SiteHeader locale={locale} t={t} />
      <article className="relative z-10 mx-auto max-w-7xl px-4 pb-20 pt-6">
        <Link href={`/${locale}/#works`} className="text-sm text-silver-dim hover:text-silver">← {t.project.back}</Link>
        <div className="mt-6 grid gap-10 lg:grid-cols-[3fr_2fr]">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-panel-2">
            <Image src={project.cover} alt={project.title} fill priority className="text-transparent object-cover" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-olive-light">{project.city}</p>
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
            <h2 className="mt-8 text-sm uppercase tracking-widest text-olive-light">{t.project.services}</h2>
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
                  <Image src={src} alt="" fill className="text-transparent object-cover" />
                </div>
              ))}
            </div>
          </section>
        )}
      </article>
      <SiteFooter t={t} />
    </div>
  );
}
