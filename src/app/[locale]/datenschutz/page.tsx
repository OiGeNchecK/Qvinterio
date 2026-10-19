import type { Metadata } from "next";
import { LegalPageView } from "@/components/legal-page";
import { privacy } from "@/content/legal";
import { getDictionary } from "@/i18n";

export const metadata: Metadata = { title: `${privacy.title} – Qvinterio` };

export default async function DatenschutzPage({ params }: PageProps<"/[locale]/datenschutz">) {
  const { locale, t } = getDictionary((await params).locale);
  return <LegalPageView page={privacy} locale={locale} t={t} />;
}
