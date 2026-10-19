import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";
import { getDictionary } from "@/i18n";

export default async function ClientLayout({ children }: LayoutProps<"/client">) {
  const [user, { t }] = await Promise.all([requireRole(["client"]), getDictionary()]);
  return (
    <AppShell user={user} title={t.client.title}>
      {children}
    </AppShell>
  );
}
