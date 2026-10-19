import { AppShell } from "@/components/app-shell";
import { RequireRole } from "@/lib/auth";
import { getDictionary } from "@/i18n";

export default async function ClientLayout({ children, params }: LayoutProps<"/[locale]/client">) {
  const { locale, t } = getDictionary((await params).locale);
  return (
    <RequireRole roles={["client"]} locale={locale}>
      <AppShell locale={locale} t={t} title={t.client.title}>
        {children}
      </AppShell>
    </RequireRole>
  );
}
