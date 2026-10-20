"use client";

import Image from "next/image";
import { builtInServices, imageSrc, useServices } from "@/lib/site-content";
import type { Dictionary, Locale } from "@/i18n";

// Line symbols in public/leistungen/, in the same order as t.home.services.
const serviceImages = [
  "01-glassystemwaende", "02-bestandsglaswaende", "03-individuelle-moebel", "04-teekuechen",
  "05-brandschutzsanierung", "06-tueren", "07-kaelte-lueftung", "08-abbruch-rueckbau",
  "09-trockenbau", "10-maler-lackierarbeiten", "11-deckensysteme", "12-fliesenarbeiten",
  "13-baureinigung", "14-elektro-kommunikation", "15-heizung-sanitaer", "16-bodenbelaege",
];

// Homepage "Leistungen" blocks; content comes from the admin panel.
export function ServicesGrid({ locale, t }: { locale: Locale; t: Dictionary }) {
  const services = useServices(locale, builtInServices(t, serviceImages));
  return (
    <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
      {services.map((s, i) => (
        <div key={`${i}-${s.title}`} className="bg-panel p-5">
          {s.icon && (
            <Image
              src={imageSrc(s.icon)}
              alt=""
              width={320}
              height={240}
              sizes="(min-width: 1024px) 280px, (min-width: 640px) 50vw, 100vw"
              className="mb-4 aspect-[4/3] w-full rounded-xl object-cover"
            />
          )}
          <h3 className="font-medium text-white">{s.title}</h3>
          <p className="mt-1.5 text-sm text-silver-dim">{s.text}</p>
        </div>
      ))}
    </div>
  );
}
