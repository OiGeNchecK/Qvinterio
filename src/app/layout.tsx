import type { Metadata } from "next";
import { Exo_2, Inter } from "next/font/google";
import { getDictionary } from "@/i18n";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin", "cyrillic"] });
const exo = Exo_2({ variable: "--font-exo", subsets: ["latin", "cyrillic"] });

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.meta.title, description: t.meta.description };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { locale } = await getDictionary();
  return (
    <html lang={locale} className={`${inter.variable} ${exo.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
