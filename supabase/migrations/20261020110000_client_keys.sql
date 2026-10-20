-- Client access keys, kept so staff can look them up and copy them later.
-- Written only by the admin-users edge function (service role).
create table public.client_keys (
  client_id uuid primary key references public.profiles (id) on delete cascade,
  key text not null,
  updated_at timestamptz not null default now()
);

alter table public.client_keys enable row level security;

create policy client_keys_staff_read on public.client_keys
  for select to authenticated
  using (public.is_staff());
