import Image from "next/image";
import { Logo } from "@/components/logo";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ButtonLink } from "@/components/button";
import { getDictionary } from "@/i18n";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type PortfolioItem = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  year: number | null;
  cover_path: string | null;
};

async function getPortfolio() {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("portfolio_items")
    .select("id, title, description, location, year, cover_path")
    .eq("published", true)
    .order("position");
  return ((data ?? []) as PortfolioItem[]).map((item) => ({
    ...item,
    coverUrl: item.cover_path
      ? supabase.storage.from("portfolio").getPublicUrl(item.cover_path).data.publicUrl
      : null,
  }));
}

export default async function Home() {
  const [{ t }, user, works] = await Promise.all([getDictionary(), getCurrentUser(), getPortfolio()]);

  return (
    <div className="relative overflow-hidden">
      <div className="gold-arc -left-[30%] top-[18rem] h-[60rem] w-[160%] -rotate-6" />
      <div className="gold-arc -right-[40%] top-[60rem] h-[50rem] w-[140%] rotate-[8deg]" />

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-4 py-5">
        <Logo />
        <nav className="hidden gap-8 text-sm text-silver-dim md:flex">
          <a href="#works" className="hover:text-silver">{t.nav.works}</a>
          <a href="#services" className="hover:text-silver">{t.nav.services}</a>
          <a href="#contact" className="hover:text-silver">{t.nav.contact}</a>
        </nav>
        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          {user ? (
            <ButtonLink href="/dashboard" variant="ghost">{t.nav.dashboard}</ButtonLink>
          ) : (
            <ButtonLink href="/login" variant="ghost">{t.nav.login}</ButtonLink>
          )}
        </div>
      </header>

      <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-4 pb-24 pt-10 lg:grid-cols-2 lg:pt-20">
        <div>
          <p className="mb-5 text-xs uppercase tracking-[0.3em] text-olive-light">{t.home.eyebrow}</p>
          <h1 className="font-display text-4xl font-semibold leading-tight text-white sm:text-6xl">
            {t.home.title}
          </h1>
          <p className="mt-6 max-w-xl text-lg text-silver-dim">{t.home.lead}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink href="#works">{t.home.ctaWorks}</ButtonLink>
            <ButtonLink href="/login" variant="ghost">{t.home.ctaClient}</ButtonLink>
          </div>
        </div>
        <div className="relative mx-auto aspect-square w-full max-w-md">
          <div className="absolute inset-0 rounded-full bg-gold/10 blur-3xl" />
          <Image
            src="/brand/emblem.webp"
            alt="Qvinterio"
            fill
            sizes="(min-width: 1024px) 28rem, 80vw"
            className="rounded-full object-cover ring-1 ring-line"
            priority
          />
        </div>
      </section>

      <section id="services" className="relative z-10 mx-auto max-w-7xl px-4 py-20">
        <h2 className="font-display text-3xl text-white">{t.home.servicesTitle}</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {t.home.services.map((s, i) => (
            <div key={s.title} className="rounded-2xl border border-line bg-panel/70 p-6">
              <div className="font-display text-sm text-olive-light">0{i + 1}</div>
              <h3 className="mt-3 text-lg font-medium text-white">{s.title}</h3>
              <p className="mt-2 text-sm text-silver-dim">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="works" className="relative z-10 mx-auto max-w-7xl px-4 py-20">
        <h2 className="font-display text-3xl text-white">{t.home.worksTitle}</h2>
        {works.length === 0 ? (
          <p className="mt-6 text-silver-dim">{t.home.worksEmpty}</p>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {works.map((w) => (
              <article key={w.id} className="overflow-hidden rounded-2xl border border-line bg-panel">
                <div className="relative aspect-[4/3] bg-panel-2">
                  {w.coverUrl && (
                    <Image src={w.coverUrl} alt={w.title} fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover" />
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-medium text-white">{w.title}</h3>
                  <p className="mt-1 text-xs text-silver-dim">
                    {[w.location, w.year].filter(Boolean).join(" · ")}
                  </p>
                  {w.description && <p className="mt-3 text-sm text-silver-dim">{w.description}</p>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-4 py-20">
        <div className="rounded-3xl border border-line bg-gradient-to-br from-panel-2 to-panel p-8 sm:p-12">
          <h2 className="font-display text-3xl text-white">{t.home.clientTitle}</h2>
          <p className="mt-4 max-w-2xl text-silver-dim">{t.home.clientText}</p>
          <ButtonLink href="/login" className="mt-8">{t.home.ctaClient}</ButtonLink>
        </div>
      </section>

      <footer id="contact" className="relative z-10 border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-12 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-display text-2xl text-white">{t.home.contactTitle}</h2>
            <p className="mt-2 max-w-md text-sm text-silver-dim">{t.home.contactText}</p>
          </div>
          <p className="text-xs text-silver-dim">© {new Date().getFullYear()} Qvinterio</p>
        </div>
      </footer>
    </div>
  );
}
