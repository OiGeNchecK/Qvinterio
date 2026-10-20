import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectView } from "@/components/project-view";
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
      <ProjectView locale={locale} t={t} slug={slug} initial={project} />
      <SiteFooter locale={locale} t={t} />
    </div>
  );
}
