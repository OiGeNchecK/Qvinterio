-- English and Polish texts for services ("Leistungen"). Empty fields fall
-- back to German on the website, like the Ukrainian ones.
alter table public.services
  add column title_en text,
  add column text_en text,
  add column title_pl text,
  add column text_pl text;

-- Translations for the built-in services; services the office renamed stay empty.
update public.services s
set title_en = v.title_en, text_en = v.text_en, title_pl = v.title_pl, text_pl = v.text_pl
from (values
  ('Glassystemwände', 'Glass partition systems', 'Custom-made, flexible glass walls with short delivery times.', 'Systemowe ściany szklane', 'Elastyczne ściany szklane wykonywane na wymiar, z krótkim czasem dostawy.'),
  ('Bestandsglaswände', 'Existing glass walls', 'Professional dismantling and reinstallation of existing glass systems.', 'Istniejące ściany szklane', 'Fachowy demontaż i ponowny montaż istniejących systemów szklanych.'),
  ('Individuelle Möbel', 'Custom furniture', 'Reception desks, cabinets, wardrobes and vanity units made to measure.', 'Meble na wymiar', 'Lady recepcyjne, szafy, garderoby i szafki pod umywalki na wymiar.'),
  ('Teeküchen', 'Kitchenettes', 'Made-to-measure kitchenettes including delivery and installation.', 'Aneksy kuchenne', 'Aneksy kuchenne na wymiar wraz z dostawą i montażem.'),
  ('Brandschutzsanierung', 'Fire protection refurbishment', 'Refurbishment to the highest safety standards.', 'Sanacja ochrony przeciwpożarowej', 'Sanacja według najwyższych standardów bezpieczeństwa.'),
  ('Türen', 'Doors', 'Fire doors, tubular frame, access, wooden and glass doors.', 'Drzwi', 'Drzwi przeciwpożarowe, ramowe, dostępowe, drewniane i szklane.'),
  ('Kälte- und Lüftungsinstallation', 'Cooling and ventilation', 'Efficient air conditioning for healthy indoor air.', 'Chłodzenie i wentylacja', 'Wydajna klimatyzacja dla zdrowego powietrza w pomieszczeniach.'),
  ('Abbruch und Rückbau', 'Demolition and strip-out', 'From strip-out to demolition, including hazardous waste disposal.', 'Rozbiórka i demontaż', 'Od wyburzeń wewnętrznych po rozbiórkę, wraz z utylizacją substancji szkodliwych.'),
  ('Trockenbau', 'Drywall', 'Fast, cost-effective space solutions.', 'Sucha zabudowa', 'Szybkie i ekonomiczne rozwiązania przestrzenne.'),
  ('Maler- und Lackierarbeiten', 'Painting and coating', 'High-quality wall finishes using modern techniques.', 'Prace malarskie i lakiernicze', 'Wysokiej jakości wykończenie ścian nowoczesnymi metodami.'),
  ('Deckensysteme', 'Ceiling systems', 'Suspended, acoustic and OWA ceilings.', 'Systemy sufitowe', 'Sufity podwieszane, akustyczne i OWA.'),
  ('Fliesenarbeiten', 'Tiling', 'Floors and walls in modern or classic design.', 'Prace glazurnicze', 'Podłogi i ściany w nowoczesnym lub klasycznym stylu.'),
  ('Baureinigung', 'Construction cleaning', 'Thorough cleaning after completion.', 'Sprzątanie po budowie', 'Dokładne sprzątanie po zakończeniu prac.'),
  ('Elektro- und Kommunikationstechnik', 'Electrical and communications', 'Electrical and network solutions for smooth operations.', 'Elektryka i teletechnika', 'Instalacje elektryczne i sieciowe dla sprawnego działania.'),
  ('Heizung und Sanitär', 'Heating and plumbing', 'Custom sanitary installations, radiators and drainage.', 'Ogrzewanie i instalacje sanitarne', 'Instalacje sanitarne na wymiar, grzejniki i kanalizacja.'),
  ('Bodenbeläge', 'Floor coverings', 'Carpet, industrial and vinyl floors for commercial use.', 'Wykładziny i posadzki', 'Wykładziny dywanowe, posadzki przemysłowe i winylowe do obiektów komercyjnych.')
) as v(title_de, title_en, text_en, title_pl, text_pl)
where s.title_de = v.title_de;
