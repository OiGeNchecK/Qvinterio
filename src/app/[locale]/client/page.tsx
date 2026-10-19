import { getDictionary } from "@/i18n";
import { ClientHome } from "./client-home";

export default async function ClientPage({ params }: PageProps<"/[locale]/client">) {
  const { locale, t } = getDictionary((await params).locale);
  return <ClientHome locale={locale} t={t} />;
}
