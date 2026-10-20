import type { Metadata } from "next";
import { Exo_2, Inter } from "next/font/google";
import { getDictionary } from "@/i18n";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin", "latin-ext", "cyrillic"] });
const exo = Exo_2({ variable: "--font-exo", subsets: ["latin", "latin-ext", "cyrillic"] });

const { t } = getDictionary("de");
export const metadata: Metadata = { title: t.meta.title, description: t.meta.description };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className={`${inter.variable} ${exo.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
