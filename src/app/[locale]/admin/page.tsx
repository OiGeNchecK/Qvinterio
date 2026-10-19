import { getDictionary } from "@/i18n";
import { AdminOverview } from "./overview";

export default async function AdminPage({ params }: PageProps<"/[locale]/admin">) {
  const { locale, t } = getDictionary((await params).locale);
  return <AdminOverview locale={locale} t={t} />;
}
