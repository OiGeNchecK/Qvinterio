-- Workers who sign in with an access key, like clients: an optional end date
-- and a revoke. A revoked or expired worker loses all roles and site access.
-- Their keys are kept in client_keys too (that table holds every key account).
create table public.worker_access (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null
);

alter table public.worker_access enable row level security;

create policy worker_access_select on public.worker_access
  for select to authenticated
  using (user_id = auth.uid() or public.is_staff());

create policy worker_access_staff on public.worker_access
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create or replace function public.has_role(r public.app_role)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur
    join public.profiles p on p.id = ur.user_id
    where ur.user_id = auth.uid() and ur.role = r and p.active
      and not exists (
        select 1 from public.worker_access w
        where w.user_id = ur.user_id and (w.revoked_at is not null or w.expires_at <= now())
      )
  );
$$;

create or replace function public.is_project_member(pid uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.project_members m
    join public.profiles p on p.id = m.user_id
    where m.project_id = pid and m.user_id = auth.uid() and p.active
      and not exists (
        select 1 from public.worker_access w
        where w.user_id = m.user_id and (w.revoked_at is not null or w.expires_at <= now())
      )
  );
$$;
