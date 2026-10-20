"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Camera, ShoppingCart } from "lucide-react";
import { ProgressBar } from "@/components/ui";
import type { Dictionary, Locale } from "@/i18n";
import { SiteOrders } from "./site-orders";
import { SitePhotos } from "./site-photos";
import type { WorkerSite } from "./worker-home";

type Tab = "orders" | "photos";

// One site of the worker: its orders and photos.
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
    { key: "orders" as const, label: w.orders, Icon: ShoppingCart },
    { key: "photos" as const, label: w.photos, Icon: Camera },
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
            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm transition ${
              tab === key ? "border-gold text-gold" : "border-transparent text-silver-dim hover:text-silver"
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === "orders" ? (
        <SiteOrders site={site} locale={locale} t={t} onChanged={onChanged} />
      ) : (
        <SitePhotos site={site} locale={locale} t={t} />
      )}
    </div>
  );
}
