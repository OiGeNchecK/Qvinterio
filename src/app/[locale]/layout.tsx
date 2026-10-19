import type { Metadata } from "next";
import { LOCALES, getDictionary } from "@/i18n";

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { t } = getDictionary((await params).locale);
  return { title: t.meta.title, description: t.meta.description };
}

export default function LocaleLayout({ children }: LayoutProps<"/[locale]">) {
  return children;
}
