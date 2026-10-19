import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";
import { getDictionary } from "@/i18n";
import { ADMIN_SECTIONS } from "./sections";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const [user, { t }] = await Promise.all([requireRole(["admin", "manager"]), getDictionary()]);
  const nav = [
    { href: "/admin", label: t.admin.sections.overview },
    ...ADMIN_SECTIONS.map((s) => ({ href: `/admin/${s}`, label: t.admin.sections[s] })),
  ];

  return (
    <AppShell user={user} title={t.admin.title} nav={nav}>
      {children}
    </AppShell>
  );
}
