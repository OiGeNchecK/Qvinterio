import { AppShell } from "@/components/app-shell";
import { RequireRole } from "@/lib/auth";
import { getDictionary } from "@/i18n";

export default async function WorkerLayout({ children, params }: LayoutProps<"/[locale]/worker">) {
  const { locale, t } = getDictionary((await params).locale);
  return (
    <RequireRole roles={["worker", "manager", "admin"]} locale={locale}>
      <AppShell locale={locale} t={t} title={t.worker.title}>
        {children}
      </AppShell>
    </RequireRole>
  );
}
