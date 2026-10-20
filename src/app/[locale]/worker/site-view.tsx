"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Camera, History, ListChecks, ShoppingCart } from "lucide-react";
import { ProgressBar } from "@/components/ui";
import type { Dictionary, Locale } from "@/i18n";
import { SiteHistory } from "./site-history";
import { SiteOrders } from "./site-orders";
import { SitePhotos } from "./site-photos";
import { SiteTasks } from "./site-tasks";
import type { WorkerSite } from "./worker-home";

type Tab = "orders" | "tasks" | "photos" | "history";

// One site of the worker: ordering, tasks, photos and their own history.
export function SiteView({
  site,
  locale,
  t,
  onChanged,
}: {
  site: WorkerSite;
  locale: Locale;
  t: Dictionary;
  onChanged: () => void;
}) {
  const w = t.worker;
  const [tab, setTab] = useState<Tab>("orders");
  const tabs = [
    { key: "orders" as const, label: w.newOrder, Icon: ShoppingCart },
    { key: "tasks" as const, label: t.tasks.title, Icon: ListChecks },
    { key: "photos" as const, label: w.photos, Icon: Camera },
    { key: "history" as const, label: w.history, Icon: History },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/${locale}/worker/`} className="inline-flex items-center gap-1.5 text-sm text-silver-dim hover:text-gold">
          <ArrowLeft size={14} /> {w.allSites}
        </Link>
        <h1 className="mt-3 font-display text-3xl text-gold">{site.name}</h1>
        {site.address && <p className="mt-1 text-silver-dim">{site.address}</p>}
        <div className="mt-4 max-w-md">
          <div className="mb-1.5 flex justify-between text-xs text-silver-dim">
            <span>{t.common.progress}</span>
            <span className="text-olive">{site.progress}%</span>
          </div>
          <ProgressBar value={site.progress} />
        </div>
      </div>

      <div className="flex gap-1 border-b border-line">
        {tabs.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`-mb-px flex flex-1 flex-col items-center gap-1 border-b-2 px-1 py-2 text-xs transition sm:flex-none sm:flex-row sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm ${
              tab === key ? "border-gold text-gold" : "border-transparent text-silver-dim hover:text-silver"
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === "orders" && <SiteOrders site={site} locale={locale} t={t} onChanged={onChanged} />}
      {tab === "tasks" && <SiteTasks site={site} locale={locale} t={t} />}
      {tab === "photos" && <SitePhotos site={site} locale={locale} t={t} />}
      {tab === "history" && <SiteHistory site={site} locale={locale} t={t} onChanged={onChanged} />}
    </div>
  );
}
