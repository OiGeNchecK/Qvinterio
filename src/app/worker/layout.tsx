import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";
import { getDictionary } from "@/i18n";

export default async function WorkerLayout({ children }: LayoutProps<"/worker">) {
  const [user, { t }] = await Promise.all([
    requireRole(["worker", "manager", "admin"]),
    getDictionary(),
  ]);
  return (
    <AppShell user={user} title={t.worker.title}>
      {children}
    </AppShell>
  );
}
