import { RequireRole } from "@/lib/auth";
import { getDictionary } from "@/i18n";
import { AdminShell } from "./admin-shell";
import { ADMIN_SECTIONS } from "./sections";

export default async function AdminLayout({ children, params }: LayoutProps<"/[locale]/admin">) {
  const { locale, t } = getDictionary((await params).locale);

  return (
    <RequireRole roles={["admin", "manager"]} locale={locale}>
      <AdminShell locale={locale} t={t} sections={ADMIN_SECTIONS}>
        {children}
      </AdminShell>
    </RequireRole>
  );
}
