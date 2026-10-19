import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getDictionary } from "@/i18n";
import { projects } from "@/content/projects";

export default async function Home() {
  const { t } = await getDictionary();

  return (
    <div className="relative overflow-hidden">
      <div className="gold-arc -left-[30%] top-[18rem] h-[60rem] w-[160%] -rotate-6" />
      <div className="gold-arc -right-[40%] top-[70rem] h-[50rem] w-[140%] rotate-[8deg]" />

      <SiteHeader />

      <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-10 lg:grid-cols-2 lg:pt-16">
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

      <section className="relative z-10 mx-auto max-w-7xl px-4 pb-16">
        <div className="grid gap-5 md:grid-cols-3">
          {t.home.values.map((v, i) => (
            <div key={v.title} className="rounded-2xl border border-line bg-panel/70 p-6">
              <div className="font-display text-sm text-olive-light">0{i + 1}</div>
              <h3 className="mt-3 text-lg font-medium text-white">{v.title}</h3>
              <p className="mt-2 text-sm text-silver-dim">{v.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="works" className="relative z-10 mx-auto max-w-7xl px-4 py-16">
        <h2 className="font-display text-3xl text-white">{t.home.worksTitle}</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p.slug}
              href={`/projekte/${p.slug}`}
              className="group overflow-hidden rounded-2xl border border-line bg-panel transition hover:border-olive"
            >
              <div className="relative aspect-[4/3] bg-panel-2">
                <Image
                  src={p.cover}
                  alt={`${p.city}, ${p.title}`}
                  fill
                  unoptimized
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover text-transparent transition duration-500 group-hover:scale-105"
                />
              </div>
              <div className="flex items-baseline justify-between gap-3 p-5">
                <div>
                  <h3 className="font-medium text-white">{p.title}</h3>
                  <p className="text-xs text-silver-dim">{p.city}</p>
                </div>
                <span className="text-xs text-olive-light">{p.area}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section id="services" className="relative z-10 mx-auto max-w-7xl px-4 py-16">
        <h2 className="font-display text-3xl text-white">{t.home.servicesTitle}</h2>
        <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {t.home.services.map((s) => (
            <div key={s.title} className="bg-panel p-5">
              <h3 className="font-medium text-white">{s.title}</h3>
              <p className="mt-1.5 text-sm text-silver-dim">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-4 py-16">
        <div className="rounded-3xl border border-line bg-gradient-to-br from-panel-2 to-panel p-8 sm:p-12">
          <h2 className="font-display text-3xl text-white">{t.home.clientTitle}</h2>
          <p className="mt-4 max-w-2xl text-silver-dim">{t.home.clientText}</p>
          <ButtonLink href="/login" className="mt-8">{t.home.ctaClient}</ButtonLink>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
