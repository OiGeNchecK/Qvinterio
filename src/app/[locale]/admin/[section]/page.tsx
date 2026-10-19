import { notFound } from "next/navigation";
import { Card } from "@/components/ui";
import { getDictionary } from "@/i18n";
import { ADMIN_SECTIONS, type AdminSection } from "../sections";

export const dynamicParams = false;

export function generateStaticParams() {
  return ADMIN_SECTIONS.map((section) => ({ section }));
}

export default async function AdminSectionPage({ params }: PageProps<"/[locale]/admin/[section]">) {
  const { section, locale } = await params;
  if (!ADMIN_SECTIONS.includes(section as AdminSection)) notFound();

  const { t } = getDictionary(locale);
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl text-white">{t.admin.sections[section as AdminSection]}</h1>
      <Card>
        <p className="text-silver-dim">{t.common.comingSoon}</p>
      </Card>
    </div>
  );
}
