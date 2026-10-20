"use client";

import Image from "next/image";
import { company } from "@/content/company";
import { asset } from "@/lib/paths";
import { imageSrc, useInstagramPosts, usePortfolio } from "@/lib/site-content";
import type { Dictionary } from "@/i18n";

export function InstagramGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

// Homepage preview of the firm's Instagram profile: a profile header and a
// grid of photos picked in the admin panel. Built from our own images, as
// Instagram's embed script does not fit a static site.
export function InstagramBlock({ t }: { t: Dictionary }) {
  const ig = company.instagram;
  const picked = useInstagramPosts(ig.url);
  const portfolio = usePortfolio();
  const posts =
    picked ??
    portfolio
      .map((p) => p.cover)
      .filter(Boolean)
      .slice(0, 6)
      .map((image) => ({ image, href: ig.url }));
  const s = t.home.instagram;

  return (
    <div className="grid items-center gap-10 rounded-3xl border border-line bg-gradient-to-br from-panel-2 to-panel p-6 sm:p-12 lg:grid-cols-[2fr_3fr]">
      <div>
        <p className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-olive">
          <InstagramGlyph size={14} /> Instagram
        </p>
        <h2 className="font-display text-3xl text-white">{s.title}</h2>
        <p className="mt-4 max-w-md text-silver-dim">{s.text}</p>
        <a
          href={ig.url}
          target="_blank"
          rel="noreferrer"
          className="mt-8 inline-flex items-center gap-2 rounded-full border border-gold/60 px-6 py-3 text-sm font-medium text-gold transition hover:bg-gold hover:text-ink"
        >
          <InstagramGlyph size={16} /> {s.follow}
        </a>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-ink/80 shadow-[0_30px_80px_-40px_rgba(196,164,107,0.35)]">
        <a href={ig.url} target="_blank" rel="noreferrer" className="flex items-center gap-4 p-4 sm:p-5">
          <span className="rounded-full bg-gradient-to-tr from-olive via-gold to-silver p-[2px]">
            <Image
              src={asset("/brand/emblem.webp")}
              alt=""
              width={64}
              height={64}
              className="h-14 w-14 rounded-full border-2 border-ink sm:h-16 sm:w-16"
            />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium text-white">{ig.handle}</span>
            <span className="block text-sm text-silver">Qvinterio</span>
            <span className="mt-0.5 block truncate text-xs text-silver-dim">{s.bio}</span>
          </span>
          <span className="hidden shrink-0 rounded-lg bg-gold px-4 py-1.5 text-sm font-medium text-ink sm:inline">
            {s.followShort}
          </span>
        </a>

        <div className="grid grid-cols-3 gap-0.5 border-t border-line bg-line">
          {posts.map((p, i) => (
            <a
              key={`${i}-${p.image}`}
              href={p.href}
              target="_blank"
              rel="noreferrer"
              aria-label={`${s.open} ${i + 1}`}
              className="group relative aspect-square overflow-hidden bg-panel"
            >
              <Image
                src={imageSrc(p.image)}
                alt=""
                fill
                sizes="(min-width: 1024px) 230px, 33vw"
                className="object-cover transition duration-500 group-hover:scale-105"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-ink/55 text-white opacity-0 transition group-hover:opacity-100">
                <InstagramGlyph size={26} />
              </span>
            </a>
          ))}
        </div>

        <a
          href={ig.url}
          target="_blank"
          rel="noreferrer"
          className="block border-t border-line py-3 text-center text-sm text-silver-dim transition hover:text-gold"
        >
          {s.more} →
        </a>
      </div>
    </div>
  );
}
