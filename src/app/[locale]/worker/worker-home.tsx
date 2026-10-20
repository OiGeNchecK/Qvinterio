"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Card, ProgressBar } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { Dictionary, Locale } from "@/i18n";
import { ErrorNote, must, useLoad } from "../admin/kit";
import { SiteView } from "./site-view";

export type WorkerSite = { id: string; name: string; address: string | null; progress: number; openOrders: number };

// RLS limits this to the sites the worker is assigned to.
async function loadSites(): Promise<WorkerSite[]> {
  const supabase = createClient();
  const projects = must<Omit<WorkerSite, "openOrders">[]>(
    await supabase
      .from("projects")
      .select("id, name, address, progress")
      .in("status", ["planned", "active"])
      .order("name"),
  );
  if (!projects.length) return [];
  const open = must<{ project_id: string }[]>(
    await supabase
      .from("orders")
      .select("project_id")
      .in("project_id", projects.map((p) => p.id))
      .in("status", ["new", "in_progress", "ordered"]),
  );
  return projects.map((p) => ({ ...p, openOrders: open.filter((o) => o.project_id === p.id).length }));
}

// Site list, or one site when the URL has ?site=<id>.
export function WorkerHome({ locale, t }: { locale: Locale; t: Dictionary }) {
  const siteId = useSearchParams().get("site");
  const { data, error, reload } = useLoad(loadSites);
  const w = t.worker;

  if (siteId) {
    const site = data?.find((s) => s.id === siteId);
    if (!data) return <ErrorNote error={error} />;
    return site ? (
      <SiteView key={site.id} site={site} locale={locale} t={t} onChanged={reload} />
    ) : (
      <Card className="space-y-3">
        <p className="text-silver-dim">{w.siteNotFound}</p>
        <Link href={`/${locale}/worker/`} className="text-sm text-gold hover:underline">
          ← {w.allSites}
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl text-gold">{w.myProjects}</h1>
      <ErrorNote error={error} />
      {data && !data.length ? (
        <Card>
          <p className="text-silver-dim">{w.noProjects}</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.map((p) => (
            <Link
              key={p.id}
              href={`/${locale}/worker/?site=${p.id}`}
              className="group block rounded-2xl border border-line bg-panel/80 p-5 transition hover:border-gold/60"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-medium text-white">{p.name}</h2>
                  {p.address && <p className="text-sm text-silver-dim">{p.address}</p>}
                </div>
                <ChevronRight size={18} className="mt-0.5 shrink-0 text-silver-dim group-hover:text-gold" />
              </div>
              <div className="mt-4 flex justify-between text-xs text-silver-dim">
                <span>{t.common.progress}</span>
                <span className="text-olive">{p.progress}%</span>
              </div>
              <div className="mt-1.5">
                <ProgressBar value={p.progress} />
              </div>
              <p className="mt-4 text-xs text-silver-dim">
                <span className={p.openOrders ? "text-gold" : ""}>{p.openOrders}</span> {w.openOrders}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
