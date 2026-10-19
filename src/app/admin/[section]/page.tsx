import { notFound } from "next/navigation";
import { Card } from "@/components/app-shell";
import { getDictionary } from "@/i18n";
import { ADMIN_SECTIONS, type AdminSection } from "../sections";

export default async function AdminSectionPage({ params }: PageProps<"/admin/[section]">) {
  const { section } = await params;
  if (!ADMIN_SECTIONS.includes(section as AdminSection)) notFound();

  const { t } = await getDictionary();
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl text-white">{t.admin.sections[section as AdminSection]}</h1>
      <Card>
        <p className="text-silver-dim">{t.common.comingSoon}</p>
      </Card>
    </div>
  );
}
