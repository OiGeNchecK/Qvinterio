-- Catalog: manufacturer, product group and usual source, so a large catalog
-- can be filtered by brand (Knauf, Caparol, ...) and group (Trockenbau, ...).

alter table public.catalog_items
  add column brand text,
  add column subcategory text,
  add column channel text;

comment on column public.catalog_items.brand is 'Hersteller / Marke, null for generic items';
comment on column public.catalog_items.subcategory is 'Warengruppe, for containers the Abfallart';
comment on column public.catalog_items.channel is 'Usual source, e.g. Baustoffhandel, Malergroßhandel';

-- Lets the catalog seed run again without creating duplicates.
create unique index catalog_items_unique_name
  on public.catalog_items (category, coalesce(brand, ''), name);

create index catalog_items_brand on public.catalog_items (brand);
