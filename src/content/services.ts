// The 16 services on the Leistungen page, in the order of qvinterio.de/leistungen.
//
// `photo` stays null until the original photo for that service is in
// public/leistungen/. qvinterio.de/leistungen itself only shows SVG icons
// (no photos), so none could be taken over yet. To add one, put the file at
// `public/leistungen/<file>` (4:3, at least 1600×1200) and set for example
// photo: { src: "/leistungen/01-glassystemwaende.jpg", width: 1600, height: 1200, alt: "…" }.
export type ServicePhoto = { src: string; width: number; height: number; alt: string };

export type Service = {
  no: string;
  slug: string;
  title: string;
  text: string;
  photo: ServicePhoto | null;
};

export const services: Service[] = [
  { no: "01", slug: "glassystemwaende", title: "Glassystemwände", text: "Flexible Glaslösungen für moderne Raumkonzepte.", photo: null },
  { no: "02", slug: "bestandsglaswaende", title: "Bestandsglaswände", text: "Vorhandene Glaswände demontieren und fachgerecht wieder einsetzen.", photo: null },
  { no: "03", slug: "individuelle-moebel", title: "Individuelle Möbel", text: "Maßmöbel für Empfang, Stauraum und Sanitärbereiche.", photo: null },
  { no: "04", slug: "teekuechen", title: "Teeküchen", text: "Individuell gefertigte Küchen inklusive Lieferung und Montage.", photo: null },
  { no: "05", slug: "brandschutzsanierung", title: "Brandschutzsanierung", text: "Fachgerechte Sanierung für den baulichen Brandschutz.", photo: null },
  { no: "06", slug: "tueren", title: "Türen", text: "Holz-, Glas-, Rohrrahmen- und Brandschutztüren liefern und montieren.", photo: null },
  { no: "07", slug: "kaelte-lueftung", title: "Kälte- und Lüftungsinstallation", text: "Passende Technik für Raumklima und Luftaustausch.", photo: null },
  { no: "08", slug: "abbruch-rueckbau", title: "Abbruch- und Rückbauarbeiten", text: "Fachgerechter Rückbau mit umweltgerechter Schadstoffentsorgung.", photo: null },
  { no: "09", slug: "trockenbau", title: "Trockenbau", text: "Neue Raumstrukturen wirtschaftlich und flexibel gestalten.", photo: null },
  { no: "10", slug: "maler-lackierarbeiten", title: "Maler- und Lackierarbeiten", text: "Hochwertige Oberflächen für Wände und weitere Bauteile.", photo: null },
  { no: "11", slug: "deckensysteme", title: "Deckensysteme", text: "Abgehängte Decken, Akustiklösungen und OWA-Systeme.", photo: null },
  { no: "12", slug: "fliesenarbeiten", title: "Fliesenarbeiten", text: "Präzise verlegte Fliesen für Boden und Wand.", photo: null },
  { no: "13", slug: "baureinigung", title: "Baureinigungsarbeiten", text: "Gründliche Reinigung zum Abschluss Ihres Bauprojekts.", photo: null },
  { no: "14", slug: "elektro-kommunikation", title: "Elektro- und Kommunikationstechnik", text: "Elektroinstallation und Vernetzung für gewerbliche Räume.", photo: null },
  { no: "15", slug: "heizung-sanitaer", title: "Heizung- und Sanitärinstallationen", text: "Sanitärbereiche, Heizkörper und Abwassersysteme bedarfsgerecht anpassen.", photo: null },
  { no: "16", slug: "bodenbelaege", title: "Bodenbeläge", text: "Teppich, Vinyl und Industrieböden passend zur Nutzung.", photo: null },
];
