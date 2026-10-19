import { Card } from "@/components/app-shell";
import { getDictionary } from "@/i18n";
import { createClient } from "@/lib/supabase/server";

type OrderRow = {
  id: string;
  category: "material" | "container" | "equipment" | "other";
  status: "new" | "in_progress" | "ordered" | "delivered" | "cancelled";
  created_at: string;
  projects: { name: string } | null;
};

export default async function AdminOverview() {
  const [{ t, locale }, supabase] = await Promise.all([getDictionary(), createClient()]);

  const [newOrders, activeProjects, latest] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase
      .from("orders")
      .select("id, category, status, created_at, projects(name)")
      .order("created_at", { ascending: false })
      .limit(10)
      .returns<OrderRow[]>(),
  ]);

  const dateFormat = new Intl.DateTimeFormat(locale === "uk" ? "uk-UA" : "de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl text-white">{t.admin.sections.overview}</h1>
      <div className="grid gap-5 sm:grid-cols-2">
        <Card>
          <div className="text-sm text-silver-dim">{t.admin.newOrders}</div>
          <div className="mt-2 font-display text-4xl text-olive-light">{newOrders.count ?? 0}</div>
        </Card>
        <Card>
          <div className="text-sm text-silver-dim">{t.admin.activeProjects}</div>
          <div className="mt-2 font-display text-4xl text-white">{activeProjects.count ?? 0}</div>
        </Card>
      </div>
      <Card>
        <h2 className="mb-4 font-medium text-white">{t.admin.latestOrders}</h2>
        {!latest.data?.length ? (
          <p className="text-sm text-silver-dim">{t.admin.noOrders}</p>
        ) : (
          <ul className="divide-y divide-line">
            {latest.data.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span className="text-white">{o.projects?.name}</span>
                <span className="text-silver-dim">{t.orderCategory[o.category]}</span>
                <span className="rounded-full border border-line px-2.5 py-0.5 text-xs">
                  {t.orderStatus[o.status]}
                </span>
                <span className="text-xs text-silver-dim">{dateFormat.format(new Date(o.created_at))}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
