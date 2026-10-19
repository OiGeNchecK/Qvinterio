// Reference projects from qvinterio.de/projekte. Images are served from the
// existing website until they are moved into Supabase storage.
const F = "https://qvinterio.de/sites/qvinterio/files";

export type Project = {
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

export const projects: Project[] = [
  {
    slug: "bremen-boconcept",
    title: "BoConcept",
    city: "Bremen",
    area: "576 m²",
    client: "Immobilienfonds",
    summary:
      "Schlüsselfertiger Ausbau eines neuen BoConcept Stores als Generalübernehmer. Eröffnung nach nur 3,5 Monaten Bauzeit.",
    services: [
      "Generalübernehmerschaft bis zur Übergabe",
      "Integrierte Planung von Architektur, Innenausbau und TGA",
      "Wiederverwendung vorhandener Materialien",
      "Treppenschließung über zwei Etagen",
      "Maßmöbel nach BoConcept-Designrichtlinien",
    ],
    cover: `${F}/styles/900_900/public/2025-10/boconcept3.png.webp?itok=_5N1va4H`,
    gallery: [`${F}/2025-10/boconcept2.png`, `${F}/2025-10/boconcept.png`],
  },
  {
    slug: "frankfurt-el50",
    title: "EL50",
    city: "Frankfurt am Main",
    area: "555 m²",
    client: "Immobilienfonds",
    summary:
      "Hochwertiger Mieterausbau für eine bundesweit tätige Anwaltskanzlei, vom Mietvertrag bis zur Übergabe in 3 Monaten. Die Bestandsglaswände wurden zu 100 % wiederverwendet.",
    services: [
      "Generalübernehmer-Ausbau bis zur schlüsselfertigen Übergabe",
      "Architektur- und TGA-Planung",
      "Wiederverwendung der Bestandsglaswände",
      "Maßmöbel: Spindschrank, Küchenzeile",
    ],
    cover: `${F}/styles/900_900/public/2025-02/20240930_073128198_ios_2.jpeg.webp?h=8b7a8168&itok=1OU2nrWt`,
    gallery: [
      `${F}/2025-02/20240930_074706316_ios.jpeg`,
      `${F}/2025-02/20240930_073418715_ios.jpeg`,
      `${F}/2025-02/20241015_115009810_ios.jpeg`,
      `${F}/2025-02/20241015_115045744_ios.jpeg`,
      `${F}/2025-02/20241015_115302147_ios.jpeg`,
      `${F}/2025-02/20241015_115337570_ios.jpeg`,
    ],
  },
  {
    slug: "hamburg-goldbekhoefe",
    title: "Goldbekhöfe",
    city: "Hamburg",
    area: "1.200 m²",
    client: "Immobilienfonds",
    summary:
      "Mieterausbau einer hochwertigen Bürofläche in Hamburg-Winterhude bei laufendem Objektbetrieb, termingerecht übergeben.",
    services: ["Komplette Neugestaltung der Bürofläche", "Begleitung von der Planung bis zur Fertigstellung"],
    cover: `${F}/styles/900_900/public/2025-02/20230926_074001449_iOS%20conv.jpg.webp?h=1ac6ba76&itok=l1JmHge-`,
    gallery: [
      `${F}/2025-02/20230926_081258483_ios_conv.jpg`,
      `${F}/2025-02/20230926_082347750_ios_conv.jpg`,
      `${F}/2025-02/20230926_082646974_ios_conv.jpg`,
    ],
  },
  {
    slug: "hamburg-stadtkueken",
    title: "Stadtküken",
    city: "Hamburg",
    area: "300 m²",
    client: "Immobilienfonds",
    summary:
      "Kompletter Mieterausbau einer Büro- und Verwaltungsfläche in den Goldbekhöfen, vom Rückbau bis zu modernen Arbeitsbereichen.",
    services: [
      "Rückbau der Bestandsflächen",
      "Neue Raumstrukturen in Trockenbauweise",
      "Koordination aller Ausbaugewerke",
    ],
    cover: `${F}/styles/900_900/public/2026-05/chatgpt_image_6._mai_2026_12_04_35_2.png.webp?itok=78D8z_Yg`,
    gallery: [
      `${F}/styles/1000_1000/public/2026-05/chatgpt_image_6._mai_2026_12_04_35_1.png.webp?itok=WuwBnFCK`,
      `${F}/styles/1000_1000/public/2026-05/chatgpt_image_6._mai_2026_12_04_38_4.png.webp?itok=fyW67wVE`,
      `${F}/styles/1000_1000/public/2026-05/chatgpt_image_6._mai_2026_12_04_38_3.png.webp?itok=omGMko_U`,
    ],
  },
  {
    slug: "leipzig-fs-ecommerce",
    title: "FS eCommerce",
    city: "Leipzig",
    area: "500 m²",
    client: "FS eCommerce",
    summary:
      "Neuaufteilung des 3. Obergeschosses für neue Anforderungen, bei gleicher Fläche und Nutzung.",
    services: ["Ganzheitliche Gestaltung des Geschosses", "Koordination und Ausführung aller Leistungen bis zur Übergabe"],
    cover: `${F}/styles/900_900/public/2025-01/leipzig-img_3988.jpg.webp?h=d528f0f5&itok=dCKSBayW`,
    gallery: [`${F}/2025-01/leipzig-img_3998.jpg`, `${F}/2025-01/leipzig-img_3991.jpg`],
  },
  {
    slug: "hamburg-winterhude",
    title: "Winterhude",
    city: "Hamburg",
    area: "800 m²",
    client: "Immobilienfonds",
    summary: "Anspruchsvoller Mieterausbau, termingerecht und auf hohem Qualitätsniveau von der Planung bis zur Fertigstellung.",
    services: [
      "Innenausbau: Decken, Böden, Wände",
      "Wände mit erhöhtem Schallschutz",
      "Sanitär, Elektro- und Kommunikationstechnik",
      "Klima- und Lüftungstechnik",
      "Brandschutzmaßnahmen",
    ],
    cover: `${F}/styles/900_900/public/2025-02/whatsapp_bild_2024-09-12_um_12.44.26_98240802.jpg.webp?itok=9sWtl6Kt`,
    gallery: [
      `${F}/2025-02/whatsapp_bild_2024-09-12_um_12.44.26_3f1318ba.jpg`,
      `${F}/2025-02/whatsapp_bild_2024-09-12_um_12.44.27_0f1af532.jpg`,
      `${F}/2025-02/whatsapp_bild_2024-09-12_um_12.44.27_04f7ad45.jpg`,
      `${F}/2025-02/whatsapp_bild_2024-09-12_um_12.44.27_381fdb6b.jpg`,
      `${F}/2025-02/whatsapp_bild_2024-09-12_um_12.44.27_aff982d1.jpg`,
      `${F}/2025-02/whatsapp_bild_2024-09-12_um_12.44.27_e29d60ff.jpg`,
    ],
  },
  {
    slug: "essen-lindenallee",
    title: "Lindenallee",
    city: "Essen",
    area: "2.400 m²",
    client: "Immobilienfonds",
    summary:
      "Hochwertiger Mieterausbau mit neu geplanter Raumstruktur, umfangreichem Rückbau und offenen Arbeitsbereichen.",
    services: [
      "Entwurf und Planung der Raumstruktur",
      "Rückbau großer Teile der Bestandsfläche",
      "Umlaufender Flur und Open-Space-Flächen",
      "Klimatisierte Besprechungscubes aus Eigenproduktion",
    ],
    cover: `${F}/styles/900_900/public/2025-02/20240508_093641546_ios.jpg.webp?itok=Jnjprd0q`,
    gallery: [
      `${F}/2025-02/20240508_093647449_ios.jpg`,
      `${F}/2025-02/20240508_100833786_ios.jpg`,
      `${F}/2025-02/img_0582_r1.jpg`,
    ],
  },
  {
    slug: "radiologie-nuernberg",
    title: "Radiologie",
    city: "Nürnberg",
    area: "380 m²",
    client: "Immobilienfonds",
    summary:
      "Umbau einer Radiologie-Praxis bei laufendem Betrieb, inklusive Einbindung medizinischer Großgeräte.",
    services: [
      "Generalunternehmung",
      "Abbruch und Ausbau der Praxisflächen",
      "Einbindung medizinischer Großgeräte",
      "Empfang, Wartebereich, CT-Raum und Flur",
    ],
    cover: `${F}/styles/900_900/public/2026-05/chatgpt_image_7._mai_2026_12_20_00.png.webp?itok=KfwQy6V0`,
    gallery: [
      `${F}/styles/1000_1000/public/2026-05/chatgpt_image_7._mai_2026_12_15_42.png.webp?itok=ZKEiUWPD`,
      `${F}/styles/1000_1000/public/2026-05/chatgpt_image_7._mai_2026_12_15_34.png.webp?itok=ey5DRF8x`,
      `${F}/styles/1000_1000/public/2026-05/chatgpt_image_7._mai_2026_12_26_28.png.webp?itok=ucdb9GlU`,
      `${F}/styles/1000_1000/public/2026-05/chatgpt_image_7._mai_2026_12_15_28.png.webp?itok=hgPg47R1`,
    ],
  },
  {
    slug: "hamburg-glueckkanja",
    title: "GlueckKanja",
    city: "Hamburg",
    area: "370 m²",
    client: "Immobilienfonds",
    summary:
      "Mieterausbau einer Bürofläche in den Goldbekhöfen mit offenen Arbeits- und Kommunikationsbereichen.",
    services: [
      "Rückbau, Abbruch und Trockenbau",
      "Boden-, Decken- und Malerarbeiten",
      "Elektro-, Klima- und Lüftungstechnik",
    ],
    cover: `${F}/styles/900_900/public/2026-05/chatgpt_image_6._mai_2026_12_48_20_2.png.webp?itok=K_uUDiav`,
    gallery: [
      `${F}/styles/1000_1000/public/2026-05/chatgpt_image_6._mai_2026_12_48_19_1.png.webp?itok=_uNXKu9J`,
      `${F}/styles/1000_1000/public/2026-05/chatgpt_image_6._mai_2026_12_48_20_3.png.webp?itok=wWsiBs7y`,
    ],
  },
  {
    slug: "pullach-sixt",
    title: "SIXT",
    city: "Pullach",
    area: "200 m²",
    client: "Sixt",
    summary: "Anspruchsvoller Mieterausbau, begleitet von der Planung bis zur Fertigstellung.",
    services: ["Planung bis Fertigstellung"],
    cover: `${F}/styles/900_900/public/2025-02/_ra_5233.jpg.webp?itok=zkfM9yp0`,
    gallery: [`${F}/2025-02/_ra_5184.jpg`, `${F}/2025-02/_ra_5216.jpg`],
  },
  {
    slug: "hamburg-beomed",
    title: "Beomed",
    city: "Hamburg",
    area: "350 m²",
    client: "Immobilienfonds",
    summary:
      "Ausbau einer Bürofläche als Generalunternehmer, vom Abbruch bis zur bezugsfertigen Übergabe.",
    services: ["Abbruch", "Oberflächen und Teppichboden", "Beleuchtung", "Teeküche und Sanitärbereich"],
    cover: `${F}/styles/900_900/public/2026-05/chatgpt_image_7._mai_2026_09_52_10_3.png.webp?itok=cscrd_1N`,
    gallery: [
      `${F}/styles/1000_1000/public/2026-05/chatgpt_image_7._mai_2026_09_52_10_1.png.webp?itok=VDtjhV3Q`,
      `${F}/styles/1000_1000/public/2026-05/chatgpt_image_7._mai_2026_09_52_10_2.png.webp?itok=wgS7oklt`,
      `${F}/styles/1000_1000/public/2026-05/chatgpt_image_7._mai_2026_09_52_10_4.png.webp?itok=yWT5GLMa`,
    ],
  },
  {
    slug: "hamburg-moorfurthweg",
    title: "Moorfurthweg",
    city: "Hamburg",
    area: "880 m²",
    client: "Immobilienfonds",
    summary: "Hochwertiger Mieterausbau einer Anwaltskanzlei, termingerecht und bei laufendem Betrieb.",
    services: ["Empfangstheke mit Raumtrenner", "Glassystemwände", "Bodenbeläge", "Teeküche", "Sanitärzellen"],
    cover: `${F}/styles/900_900/public/2025-02/20230725_081533882_ios.jpeg.webp?itok=ngAr6-xK`,
    gallery: [`${F}/2025-02/20230725_081449387_ios.jpeg`, `${F}/2025-02/20230725_081542302_ios.jpeg`],
  },
];

export function getProject(slug: string) {
  return projects.find((p) => p.slug === slug);
}
