import { Suspense } from "react";
import { ProjectViewFromQuery } from "@/components/project-view";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getDictionary } from "@/i18n";

export default async function ProjectQueryPage({ params }: PageProps<"/[locale]/projekte/ansicht">) {
  const { locale, t } = getDictionary((await params).locale);
  return (
    <div className="relative overflow-hidden">
      <SiteHeader locale={locale} t={t} />
      <Suspense>
        <ProjectViewFromQuery locale={locale} t={t} />
      </Suspense>
      <SiteFooter locale={locale} t={t} />
    </div>
  );
}
