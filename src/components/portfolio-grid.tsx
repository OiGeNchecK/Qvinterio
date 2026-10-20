"use client";

import Image from "next/image";
import Link from "next/link";
import { imageSrc, projectHref, usePortfolio } from "@/lib/site-content";
import type { Locale } from "@/i18n";

// Homepage project cards; content comes from the admin panel.
export function PortfolioGrid({ locale }: { locale: Locale }) {
  const projects = usePortfolio();
  return (
    <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((p) => (
        <Link
          key={p.slug}
          href={projectHref(locale, p.slug)}
          className="group overflow-hidden rounded-2xl border border-line bg-panel transition hover:border-olive"
        >
          <div className="relative aspect-[4/3] bg-panel-2">
            {p.cover && (
              <Image
                src={imageSrc(p.cover)}
                alt={`${p.city}, ${p.title}`}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover text-transparent transition duration-500 group-hover:scale-105"
              />
            )}
          </div>
          <div className="flex items-baseline justify-between gap-3 p-5">
            <div>
              <h3 className="font-medium text-white">{p.title}</h3>
              <p className="text-xs text-silver-dim">{p.city}</p>
            </div>
            <span className="text-xs text-olive">{p.area}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
