import { useEffect, useState } from "react";
import { projects as staticProjects } from "@/content/projects";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { asset } from "@/lib/paths";
import type { Dictionary, Locale } from "@/i18n";

// Public site content (projects and services) is edited in the admin panel
// and read from Supabase in the browser. Until it loads, and whenever
// Supabase is unreachable, the copy built into the site is shown.

export type PortfolioItem = {
  slug: string;
  title: string;
  city: string;
  area: string;
  client: string;
  summary: string;
  services: string[];
  cover: string;
  gallery: string[];
};

export type ServiceItem = { title: string; text: string; icon: string };

// Projects that have their own pre-built page under /projekte/<slug>/.
export const STATIC_SLUGS = new Set(staticProjects.map((p) => p.slug));

export function projectHref(locale: Locale, slug: string) {
  return STATIC_SLUGS.has(slug) ? `/${locale}/projekte/${slug}/` : `/${locale}/projekte/ansicht/?slug=${encodeURIComponent(slug)}`;
}

// Site paths (/leistungen/...) need the base path; storage URLs are absolute.
export function imageSrc(src: string) {
  return src.startsWith("/") ? asset(src) : src;
}

type PortfolioRow = {
  slug: string;
  title: string;
  city: string | null;
  area: string | null;
  client: string | null;
  description: string | null;
  services: string[];
  cover_url: string | null;
  gallery: string[];
};

const PORTFOLIO_SELECT = "slug, title, city, area, client, description, services, cover_url, gallery";

function fromRow(r: PortfolioRow): PortfolioItem {
  return {
    slug: r.slug,
    title: r.title,
    city: r.city ?? "",
    area: r.area ?? "",
    client: r.client ?? "",
    summary: r.description ?? "",
    services: r.services,
    cover: r.cover_url ?? "",
    gallery: r.gallery,
  };
}

export const builtInPortfolio: PortfolioItem[] = staticProjects;

export function builtInServices(t: Dictionary, icons: string[]): ServiceItem[] {
  return t.home.services.map((s, i) => ({ ...s, icon: `/leistungen/${icons[i]}.webp` }));
}

function useRemote<T>(initial: T, load: () => PromiseLike<T | null>) {
  const [value, setValue] = useState(initial);
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    load().then(
      (v) => active && v !== null && setValue(v),
      () => undefined,
    );
    return () => {
      active = false;
    };
    // Loaded once per page view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return value;
}

export function usePortfolio() {
  return useRemote(builtInPortfolio, async () => {
    const { data, error } = await createClient()
      .from("portfolio_items")
      .select(PORTFOLIO_SELECT)
      .eq("published", true)
      .order("position")
      .overrideTypes<PortfolioRow[], { merge: false }>();
    return error ? null : data.map(fromRow);
  });
}

// undefined: still loading; null: no such published project.
export function usePortfolioItem(slug: string | null, initial: PortfolioItem | undefined) {
  return useRemote<PortfolioItem | null | undefined>(initial, async () => {
    if (!slug) return null;
    const { data, error } = await createClient()
      .from("portfolio_items")
      .select(PORTFOLIO_SELECT)
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle()
      .overrideTypes<PortfolioRow | null, { merge: false }>();
    if (error) return initial ?? null;
    return data ? fromRow(data) : null;
  });
}

// Translations are optional; empty fields fall back to German.
type ServiceRow = Record<`title_${Locale}`, string | null> & Record<`text_${Locale}`, string | null> & { icon_url: string | null };

export function useServices(locale: Locale, initial: ServiceItem[]) {
  return useRemote(initial, async () => {
    const { data, error } = await createClient()
      .from("services")
      .select("title_de, text_de, title_uk, text_uk, title_en, text_en, title_pl, text_pl, icon_url")
      .eq("published", true)
      .order("position")
      .overrideTypes<ServiceRow[], { merge: false }>();
    if (error) return null;
    return data.map((r) => ({
      title: r[`title_${locale}`] || r.title_de || "",
      text: r[`text_${locale}`] || r.text_de || "",
      icon: r.icon_url ?? "",
    }));
  });
}

export type InstagramPost = { image: string; href: string };

// Homepage Instagram block. Without picked photos it falls back to the
// portfolio covers, all linking to the profile.
export function useInstagramPosts(profileUrl: string) {
  return useRemote<InstagramPost[] | null>(null, async () => {
    const { data, error } = await createClient()
      .from("instagram_posts")
      .select("image_url, post_url")
      .eq("published", true)
      .order("position")
      .limit(6)
      .overrideTypes<{ image_url: string; post_url: string | null }[], { merge: false }>();
    if (error || !data.length) return null;
    return data.map((r) => ({ image: r.image_url, href: r.post_url || profileUrl }));
  });
}
