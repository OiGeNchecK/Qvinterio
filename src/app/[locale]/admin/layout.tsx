import { AppShell } from "@/components/app-shell";
import { RequireRole } from "@/lib/auth";
import { getDictionary } from "@/i18n";
import { ADMIN_SECTIONS } from "./sections";

export default async function AdminLayout({ children, params }: LayoutProps<"/[locale]/admin">) {
  const { locale, t } = getDictionary((await params).locale);
  const nav = [
    { href: `/${locale}/admin/`, label: t.admin.sections.overview },
    ...ADMIN_SECTIONS.map((s) => ({ href: `/${locale}/admin/${s}/`, label: t.admin.sections[s] })),
  ];

  return (
    <RequireRole roles={["admin", "manager"]} locale={locale}>
      <AppShell locale={locale} t={t} title={t.admin.title} nav={nav}>
        {children}
      </AppShell>
    </RequireRole>
  );
}
