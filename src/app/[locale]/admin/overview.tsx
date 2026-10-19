"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { dateLocale, type Dictionary, type Locale } from "@/i18n";

type OrderRow = {
  id: string;
  category: "material" | "container" | "equipment" | "other";
  status: "new" | "in_progress" | "ordered" | "delivered" | "cancelled";
  created_at: string;
  projects: { name: string } | null;
};

type Data = { newOrders: number; activeProjects: number; latest: OrderRow[] };

export function AdminOverview({ locale, t }: { locale: Locale; t: Dictionary }) {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "new"),
      supabase.from("projects").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase
        .from("orders")
        .select("id, category, status, created_at, projects(name)")
        .order("created_at", { ascending: false })
        .limit(10)
        .overrideTypes<OrderRow[], { merge: false }>(),
    ]).then(([newOrders, activeProjects, latest]) =>
      setData({
        newOrders: newOrders.count ?? 0,
        activeProjects: activeProjects.count ?? 0,
        latest: latest.data ?? [],
      }),
    );
  }, []);

  const dateFormat = new Intl.DateTimeFormat(dateLocale(locale), { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl text-white">{t.admin.sections.overview}</h1>
      <div className="grid gap-5 sm:grid-cols-2">
        <Card>
          <div className="text-sm text-silver-dim">{t.admin.newOrders}</div>
          <div className="mt-2 font-display text-4xl text-olive">{data?.newOrders ?? "–"}</div>
        </Card>
        <Card>
          <div className="text-sm text-silver-dim">{t.admin.activeProjects}</div>
          <div className="mt-2 font-display text-4xl text-white">{data?.activeProjects ?? "–"}</div>
        </Card>
      </div>
      <Card>
        <h2 className="mb-4 font-medium text-white">{t.admin.latestOrders}</h2>
        {data && !data.latest.length ? (
          <p className="text-sm text-silver-dim">{t.admin.noOrders}</p>
        ) : (
          <ul className="divide-y divide-line">
            {data?.latest.map((o) => (
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
