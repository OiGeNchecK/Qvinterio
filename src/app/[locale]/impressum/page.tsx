import type { Metadata } from "next";
import { LegalPageView } from "@/components/legal-page";
import { imprint } from "@/content/legal";
import { getDictionary } from "@/i18n";

export const metadata: Metadata = { title: `${imprint.title} – Qvinterio` };

export default async function ImpressumPage({ params }: PageProps<"/[locale]/impressum">) {
  const { locale, t } = getDictionary((await params).locale);
  return <LegalPageView page={imprint} locale={locale} t={t} />;
}
