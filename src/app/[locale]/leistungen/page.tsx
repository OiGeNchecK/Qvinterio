import type { Metadata } from "next";
import Image from "next/image";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { company } from "@/content/company";
import { services } from "@/content/services";
import { getDictionary } from "@/i18n";
import { asset } from "@/lib/paths";
import "./leistungen.css";

export const metadata: Metadata = {
  title: "Leistungen – Qvinterio",
  description: "Gewerblicher Innenausbau – von einzelnen Maßnahmen bis zur schlüsselfertigen Umsetzung.",
};

const requestMail = `mailto:${company.email}?subject=${encodeURIComponent("Projektanfrage")}`;

export default async function LeistungenPage({ params }: PageProps<"/[locale]/leistungen">) {
  const { locale, t } = getDictionary((await params).locale);

  return (
    <div className="lp-page">
      <div aria-hidden className="lp-texture" />
      <div className="relative">
        <SiteHeader locale={locale} t={t} />

        <main>
          <section className="lp-hero" aria-labelledby="leistungen-titel">
            <div aria-hidden className="lp-hero-lines" />
            <div className="lp-hero-inner">
              <p className="lp-eyebrow">Unsere Leistungen</p>
              <h1 id="leistungen-titel" className="lp-title">Räume mit Anspruch.</h1>
              <p className="lp-lead">
                Gewerblicher Innenausbau – von einzelnen Maßnahmen bis zur schlüsselfertigen Umsetzung.
              </p>
              <div className="lp-actions">
                <a href="#leistungen-uebersicht" className="lp-btn lp-btn-primary">Leistungen entdecken</a>
                <a href="#projekt-anfragen" className="lp-btn lp-btn-ghost">Projekt anfragen</a>
              </div>
            </div>
            <Image
              src={asset("/brand/emblem.webp")}
              alt=""
              width={320}
              height={320}
              className="lp-emblem"
              preload
            />
          </section>

          <section id="leistungen-uebersicht" className="lp-overview" aria-labelledby="ueberblick-titel">
            <div className="lp-section-head">
              <span aria-hidden className="lp-rule" />
              <h2 id="ueberblick-titel" className="lp-h2">Leistungen im Überblick.</h2>
            </div>

            <ol className="lp-grid">
              {services.map((service) => (
                <li key={service.slug} className="lp-card">
                  <article aria-labelledby={`leistung-${service.slug}`}>
                    <div className="lp-media">
                      {service.photo ? (
                        <Image
                          src={asset(service.photo.src)}
                          alt={service.photo.alt}
                          width={service.photo.width}
                          height={service.photo.height}
                          sizes="(min-width: 768px) 420px, 78vw"
                          loading="lazy"
                          className="lp-photo"
                        />
                      ) : (
                        <div className="lp-placeholder" role="img" aria-label={`Foto für ${service.title} folgt`}>
                          <span aria-hidden className="lp-placeholder-no">{service.no}</span>
                          <span aria-hidden className="lp-placeholder-note">Foto folgt</span>
                        </div>
                      )}
                    </div>
                    <div className="lp-body">
                      <span className="lp-no">{service.no}</span>
                      <h3 id={`leistung-${service.slug}`} className="lp-h3">{service.title}</h3>
                      <p className="lp-text">{service.text}</p>
                    </div>
                  </article>
                </li>
              ))}
            </ol>
          </section>

          <section id="projekt-anfragen" className="lp-cta" aria-labelledby="anfrage-titel">
            <div className="lp-cta-box">
              <span aria-hidden className="lp-rule" />
              <h2 id="anfrage-titel" className="lp-h2">Ihr Projekt. Unser gemeinsamer Anspruch.</h2>
              <p className="lp-lead">Sprechen wir über Ihre Räume und die passende Umsetzung.</p>
              <div className="lp-actions">
                <a href={requestMail} className="lp-btn lp-btn-primary">Projekt anfragen</a>
              </div>
              <dl className="lp-contact">
                <div>
                  <dt>Ansprechpartner</dt>
                  <dd>{company.contactPerson}</dd>
                </div>
                <div>
                  <dt>Telefon</dt>
                  <dd><a href={`tel:${company.phone.replace(/\s/g, "")}`}>{company.phone}</a></dd>
                </div>
                <div>
                  <dt>E-Mail</dt>
                  <dd><a href={`mailto:${company.email}`}>{company.email}</a></dd>
                </div>
              </dl>
            </div>
          </section>
        </main>

        <SiteFooter locale={locale} t={t} />
      </div>
    </div>
  );
}
