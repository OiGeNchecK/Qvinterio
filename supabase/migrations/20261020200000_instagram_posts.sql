-- Photos for the Instagram preview block on the homepage. Instagram has no
-- embed that suits a static site, so staff pick the pictures in the admin
-- panel and each one links to its post (or to the profile).

create table public.instagram_posts (
  id uuid primary key default gen_random_uuid(),
  position smallint not null default 0,
  -- A URL in the public "portfolio" bucket (folder instagram/).
  image_url text not null,
  post_url text check (post_url is null or post_url ~ '^https://(www\.)?instagram\.com/'),
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create index on public.instagram_posts (position);

alter table public.instagram_posts enable row level security;

create policy instagram_posts_public on public.instagram_posts for select to anon, authenticated
  using (published or public.is_staff());
create policy instagram_posts_staff on public.instagram_posts for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
