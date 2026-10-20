-- Public site content editable from the admin panel:
-- portfolio projects (homepage "Projekte") and services ("Leistungen").

-- The older cover_path, image_paths and location columns stay unused.
alter table public.portfolio_items
  add column slug text unique,
  add column city text,
  add column area text,
  add column client text,
  add column services text[] not null default '{}',
  -- Full URLs: files in the public "portfolio" bucket or older external images.
  add column cover_url text,
  add column gallery text[] not null default '{}';

create table public.services (
  id uuid primary key default gen_random_uuid(),
  position smallint not null default 0,
  title_de text not null,
  text_de text,
  title_uk text,
  text_uk text,
  -- A site path (/leistungen/...) or a URL in the "portfolio" bucket.
  icon_url text,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create index on public.services (position);

alter table public.services enable row level security;

create policy services_public on public.services for select to anon, authenticated
  using (published or public.is_staff());
create policy services_staff on public.services for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
