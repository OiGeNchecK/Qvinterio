-- Messages from the contact form on the public homepage. Anyone may send one;
-- only staff (admins and Bauleiter) read and handle them in the admin panel.
--
-- E-mail later: rows with emailed_at is null are the outbox, like
-- public.notifications (e.g. sent through Microsoft Graph / Outlook).

create type public.contact_request_status as enum ('new', 'in_progress', 'done');

create table public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 200),
  company text check (length(company) <= 200),
  email text not null check (length(email) <= 320 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text check (length(phone) <= 60),
  message text not null check (length(btrim(message)) between 1 and 5000),
  locale text check (length(locale) <= 10),
  status public.contact_request_status not null default 'new',
  handled_by uuid references public.profiles (id) on delete set null,
  emailed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.contact_requests (created_at desc);
create index on public.contact_requests (status);

create trigger contact_requests_touch before update on public.contact_requests
  for each row execute function public.touch_updated_at();

-- Simple flood guard: at most 3 messages per e-mail address per hour and
-- 50 in total per hour.
create function public.contact_request_guard()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if (select count(*) from public.contact_requests
      where lower(email) = lower(new.email) and created_at > now() - interval '1 hour') >= 3
    or (select count(*) from public.contact_requests where created_at > now() - interval '1 hour') >= 50
  then
    raise exception 'too many contact requests' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger contact_requests_guard before insert on public.contact_requests
  for each row execute function public.contact_request_guard();

revoke execute on function public.contact_request_guard() from public, anon, authenticated;

alter table public.contact_requests enable row level security;

create policy contact_requests_insert on public.contact_requests for insert to anon, authenticated
  with check (status = 'new' and handled_by is null and emailed_at is null);
create policy contact_requests_select on public.contact_requests for select to authenticated
  using (public.is_staff());
create policy contact_requests_update on public.contact_requests for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy contact_requests_delete on public.contact_requests for delete to authenticated
  using (public.is_staff());

revoke all on public.contact_requests from anon;
grant insert (name, company, email, phone, message, locale) on public.contact_requests to anon;
