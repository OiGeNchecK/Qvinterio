import { notFound } from "next/navigation";
import { Card } from "@/components/ui";
import { getDictionary } from "@/i18n";
import { ADMIN_SECTIONS, type AdminSection } from "../sections";
import { AccessSection } from "../panels/access";
import { ContactsSection } from "../panels/contacts";
import { OrdersSection } from "../panels/orders";
import { ProjectsSection } from "../panels/projects";
import { UsersSection } from "../panels/users";

export const dynamicParams = false;

export function generateStaticParams() {
  return ADMIN_SECTIONS.map((section) => ({ section }));
}

export default async function AdminSectionPage({ params }: PageProps<"/[locale]/admin/[section]">) {
  const { section, locale: rawLocale } = await params;
  if (!ADMIN_SECTIONS.includes(section as AdminSection)) notFound();

  const { locale, t } = getDictionary(rawLocale);
  switch (section as AdminSection) {
    case "orders":
      return <OrdersSection locale={locale} t={t} />;
    case "projects":
      return <ProjectsSection locale={locale} t={t} />;
    case "contacts":
      return <ContactsSection t={t} />;
    case "users":
      return <UsersSection t={t} />;
    case "access":
      return <AccessSection locale={locale} t={t} />;
    default:
      return (
        <div className="space-y-6">
          <h1 className="font-display text-3xl text-white">{t.admin.sections[section as AdminSection]}</h1>
          <Card>
            <p className="text-silver-dim">{t.common.comingSoon}</p>
          </Card>
        </div>
      );
  }
}
