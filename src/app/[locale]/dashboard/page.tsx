import { getDictionary } from "@/i18n";
import { Dashboard } from "./dashboard";

export default async function DashboardPage({ params }: PageProps<"/[locale]/dashboard">) {
  const { locale, t } = getDictionary((await params).locale);
  return <Dashboard locale={locale} t={t} />;
}
