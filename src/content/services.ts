// The 16 services on the Leistungen page, in the order of qvinterio.de/leistungen.
//
// The service images are the gold and silver line symbols the owner supplied
// as one 4×4 sheet (2026-10-19), cut in reading order into public/leistungen/.
// `photo` may be null for a new service until its image is added there.
export type ServicePhoto = { src: string; width: number; height: number; alt: string };

export type Service = {
  no: string;
  slug: string;
  title: string;
  text: string;
  photo: ServicePhoto | null;
};

export const services: Service[] = [
  { no: "01", slug: "glassystemwaende", title: "Glassystemwände", text: "Flexible Glaslösungen für moderne Raumkonzepte.", photo: { src: "/leistungen/01-glassystemwaende.webp", width: 320, height: 240, alt: "Liniensymbol einer Glaswand mit zwei Glasfeldern" } },
  { no: "02", slug: "bestandsglaswaende", title: "Bestandsglaswände", text: "Vorhandene Glaswände demontieren und fachgerecht wieder einsetzen.", photo: { src: "/leistungen/02-bestandsglaswaende.webp", width: 320, height: 240, alt: "Liniensymbol einer Glaswand mit Pfeilen für Demontage und Wiedereinbau" } },
  { no: "03", slug: "individuelle-moebel", title: "Individuelle Möbel", text: "Maßmöbel für Empfang, Stauraum und Sanitärbereiche.", photo: { src: "/leistungen/03-individuelle-moebel.webp", width: 320, height: 240, alt: "Liniensymbol mit Theke, Hocker, Leuchte und Regal" } },
  { no: "04", slug: "teekuechen", title: "Teeküchen", text: "Individuell gefertigte Küchen inklusive Lieferung und Montage.", photo: { src: "/leistungen/04-teekuechen.webp", width: 320, height: 240, alt: "Liniensymbol einer Küchenzeile mit Spüle und Oberschrank" } },
  { no: "05", slug: "brandschutzsanierung", title: "Brandschutzsanierung", text: "Fachgerechte Sanierung für den baulichen Brandschutz.", photo: { src: "/leistungen/05-brandschutzsanierung.webp", width: 320, height: 240, alt: "Liniensymbol einer Wand mit Brandschutz-Warnzeichen" } },
  { no: "06", slug: "tueren", title: "Türen", text: "Holz-, Glas-, Rohrrahmen- und Brandschutztüren liefern und montieren.", photo: { src: "/leistungen/06-tueren.webp", width: 320, height: 240, alt: "Liniensymbol einer Tür" } },
  { no: "07", slug: "kaelte-lueftung", title: "Kälte- und Lüftungsinstallation", text: "Passende Technik für Raumklima und Luftaustausch.", photo: { src: "/leistungen/07-kaelte-lueftung.webp", width: 320, height: 240, alt: "Liniensymbol eines Ventilators mit Luftströmen" } },
  { no: "08", slug: "abbruch-rueckbau", title: "Abbruch- und Rückbauarbeiten", text: "Fachgerechter Rückbau mit umweltgerechter Schadstoffentsorgung.", photo: { src: "/leistungen/08-abbruch-rueckbau.webp", width: 320, height: 240, alt: "Liniensymbol einer gerissenen Wand mit Meißel und Bruchstücken" } },
  { no: "09", slug: "trockenbau", title: "Trockenbau", text: "Neue Raumstrukturen wirtschaftlich und flexibel gestalten.", photo: { src: "/leistungen/09-trockenbau.webp", width: 320, height: 240, alt: "Liniensymbol einer Trockenbauwand mit Ständerwerk" } },
  { no: "10", slug: "maler-lackierarbeiten", title: "Maler- und Lackierarbeiten", text: "Hochwertige Oberflächen für Wände und weitere Bauteile.", photo: { src: "/leistungen/10-maler-lackierarbeiten.webp", width: 320, height: 240, alt: "Liniensymbol einer Farbrolle vor einer gestrichenen Wand" } },
  { no: "11", slug: "deckensysteme", title: "Deckensysteme", text: "Abgehängte Decken, Akustiklösungen und OWA-Systeme.", photo: { src: "/leistungen/11-deckensysteme.webp", width: 320, height: 240, alt: "Liniensymbol einer abgehängten Decke mit Leuchte" } },
  { no: "12", slug: "fliesenarbeiten", title: "Fliesenarbeiten", text: "Präzise verlegte Fliesen für Boden und Wand.", photo: { src: "/leistungen/12-fliesenarbeiten.webp", width: 320, height: 240, alt: "Liniensymbol einer gefliesten Fläche mit Maßlinien" } },
  { no: "13", slug: "baureinigung", title: "Baureinigungsarbeiten", text: "Gründliche Reinigung zum Abschluss Ihres Bauprojekts.", photo: { src: "/leistungen/13-baureinigung.webp", width: 320, height: 240, alt: "Liniensymbol eines Fensterabziehers mit Glanzstern" } },
  { no: "14", slug: "elektro-kommunikation", title: "Elektro- und Kommunikationstechnik", text: "Elektroinstallation und Vernetzung für gewerbliche Räume.", photo: { src: "/leistungen/14-elektro-kommunikation.webp", width: 320, height: 240, alt: "Liniensymbol eines Blitzes mit Leitungen und Anschlüssen" } },
  { no: "15", slug: "heizung-sanitaer", title: "Heizung- und Sanitärinstallationen", text: "Sanitärbereiche, Heizkörper und Abwassersysteme bedarfsgerecht anpassen.", photo: { src: "/leistungen/15-heizung-sanitaer.webp", width: 320, height: 240, alt: "Liniensymbol eines Heizkörpers und eines Wasserhahns" } },
  { no: "16", slug: "bodenbelaege", title: "Bodenbeläge", text: "Teppich, Vinyl und Industrieböden passend zur Nutzung.", photo: { src: "/leistungen/16-bodenbelaege.webp", width: 320, height: 240, alt: "Liniensymbol eines verlegten Dielenbodens" } },
];
