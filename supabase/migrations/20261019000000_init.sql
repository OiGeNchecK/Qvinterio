-- Qvinterio: initial schema
-- Roles, construction sites (projects), stages, photos, contacts, catalog,
-- orders with history, temporary client access, public portfolio.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.app_role as enum ('admin', 'manager', 'worker', 'client');
create type public.project_status as enum ('planned', 'active', 'paused', 'done');
create type public.stage_status as enum ('pending', 'in_progress', 'done');
create type public.contact_type as enum (
  'supplier_material', 'supplier_container', 'equipment', 'subcontractor', 'worker', 'other'
);
create type public.order_category as enum ('material', 'container', 'equipment', 'other');
create type public.order_status as enum ('new', 'in_progress', 'ordered', 'delivered', 'cancelled');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  locale text not null default 'de' check (locale in ('de', 'uk')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.app_role not null,
  primary key (user_id, role)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  description text,
  status public.project_status not null default 'planned',
  progress smallint not null default 0 check (progress between 0 and 100),
  -- Person who receives and places orders for this site (admin or manager).
  manager_id uuid references public.profiles (id) on delete set null,
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (project_id, user_id)
);

create table public.project_stages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  position smallint not null default 0,
  status public.stage_status not null default 'pending',
  progress smallint not null default 0 check (progress between 0 and 100),
  started_at date,
  finished_at date
);

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  stage_id uuid references public.project_stages (id) on delete set null,
  author_id uuid references public.profiles (id) on delete set null default auth.uid(),
  -- Path inside the "project-photos" bucket: <project_id>/<file>
  storage_path text not null,
  caption text,
  visible_to_client boolean not null default true,
  taken_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  type public.contact_type not null,
  company text,
  person text,
  phone text,
  email text,
  address text,
  categories text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now()
);

create table public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  category public.order_category not null,
  name text not null,
  unit text not null default 'Stk',
  default_contact_id uuid references public.contacts (id) on delete set null,
  active boolean not null default true
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  assignee_id uuid references public.profiles (id) on delete set null,
  category public.order_category not null,
  status public.order_status not null default 'new',
  needed_by date,
  contact_id uuid references public.contacts (id) on delete set null,
  delivery_date date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  catalog_item_id uuid references public.catalog_items (id) on delete set null,
  description text not null,
  quantity numeric(12, 2) not null default 1 check (quantity > 0),
  unit text not null default 'Stk'
);

create table public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null default auth.uid(),
  status public.order_status,
  note text,
  created_at timestamptz not null default now()
);

-- Temporary read-only access of a client to one construction site.
create table public.client_access (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location text,
  year smallint,
  -- Paths inside the public "portfolio" bucket.
  cover_path text,
  image_paths text[] not null default '{}',
  published boolean not null default false,
  position smallint not null default 0,
  created_at timestamptz not null default now()
);

create index on public.project_members (user_id);
create index on public.project_stages (project_id, position);
create index on public.photos (project_id, taken_at desc);
create index on public.orders (project_id, created_at desc);
create index on public.orders (assignee_id, status);
create index on public.order_items (order_id);
create index on public.order_events (order_id, created_at);
create index on public.client_access (client_id);
create index on public.client_access (project_id);

-- ---------------------------------------------------------------------------
-- Access helpers (security definer so policies don't recurse through RLS)
-- ---------------------------------------------------------------------------

create function public.has_role(r public.app_role)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur
    join public.profiles p on p.id = ur.user_id
    where ur.user_id = auth.uid() and ur.role = r and p.active
  );
$$;

create function public.is_staff()
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.has_role('admin') or public.has_role('manager');
$$;

create function public.is_project_member(pid uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.project_members m
    join public.profiles p on p.id = m.user_id
    where m.project_id = pid and m.user_id = auth.uid() and p.active
  );
$$;

create function public.client_can_view(pid uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.client_access a
    where a.project_id = pid
      and a.client_id = auth.uid()
      and a.revoked_at is null
      and a.expires_at > now()
  );
$$;

-- Staff, team members and clients with valid access may see a site.
create function public.can_view_project(pid uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.is_staff() or public.is_project_member(pid) or public.client_can_view(pid);
$$;

-- Staff and team members work on a site (orders, photos).
create function public.can_work_on_project(pid uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.is_staff() or public.is_project_member(pid);
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.touch_updated_at()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

-- New orders go to the site's responsible person unless set explicitly.
create function public.order_default_assignee()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.assignee_id is null then
    select manager_id into new.assignee_id from public.projects where id = new.project_id;
  end if;
  return new;
end;
$$;

create trigger orders_default_assignee before insert on public.orders
  for each row execute function public.order_default_assignee();

-- Every status change is written to the order history.
create function public.log_order_status()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.order_events (order_id, actor_id, status)
    values (new.id, auth.uid(), new.status);
  end if;
  return new;
end;
$$;

create trigger orders_log_status after insert or update of status on public.orders
  for each row execute function public.log_order_status();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_stages enable row level security;
alter table public.photos enable row level security;
alter table public.contacts enable row level security;
alter table public.catalog_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;
alter table public.client_access enable row level security;
alter table public.portfolio_items enable row level security;

-- profiles: everyone sees themselves; staff and workers see the team.
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff() or public.has_role('worker'));
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and active);
create policy profiles_admin on public.profiles for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));

-- user_roles: read own, admin manages.
create policy roles_select on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role('admin'));
create policy roles_admin on public.user_roles for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));

-- projects
create policy projects_select on public.projects for select to authenticated
  using (public.can_view_project(id));
create policy projects_staff on public.projects for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy members_select on public.project_members for select to authenticated
  using (public.can_work_on_project(project_id));
create policy members_staff on public.project_members for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy stages_select on public.project_stages for select to authenticated
  using (public.can_view_project(project_id));
create policy stages_staff on public.project_stages for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- photos: team uploads; clients see only photos marked for them.
create policy photos_select on public.photos for select to authenticated
  using (
    public.can_work_on_project(project_id)
    or (visible_to_client and public.client_can_view(project_id))
  );
create policy photos_insert on public.photos for insert to authenticated
  with check (public.can_work_on_project(project_id) and author_id = auth.uid());
create policy photos_update on public.photos for update to authenticated
  using (public.is_staff() or author_id = auth.uid())
  with check (public.can_work_on_project(project_id));
create policy photos_delete on public.photos for delete to authenticated
  using (public.is_staff() or author_id = auth.uid());

-- contacts: staff only.
create policy contacts_staff on public.contacts for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- catalog: workers read active items, staff manage.
create policy catalog_select on public.catalog_items for select to authenticated
  using (public.is_staff() or (active and public.has_role('worker')));
create policy catalog_staff on public.catalog_items for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- orders: team of the site creates and sees; staff process.
create policy orders_select on public.orders for select to authenticated
  using (public.can_work_on_project(project_id));
create policy orders_insert on public.orders for insert to authenticated
  with check (
    public.can_work_on_project(project_id)
    and created_by = auth.uid()
    and (status = 'new' or public.is_staff())
  );
create policy orders_staff_update on public.orders for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
-- The author may still cancel an order nobody has picked up yet.
create policy orders_author_cancel on public.orders for update to authenticated
  using (created_by = auth.uid() and status = 'new')
  with check (created_by = auth.uid() and status in ('new', 'cancelled'));
create policy orders_staff_delete on public.orders for delete to authenticated
  using (public.has_role('admin'));

create policy order_items_select on public.order_items for select to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_id and public.can_work_on_project(o.project_id)
  ));
create policy order_items_write on public.order_items for all to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_id
      and (public.is_staff() or (o.created_by = auth.uid() and o.status = 'new'))
  ))
  with check (exists (
    select 1 from public.orders o
    where o.id = order_id
      and (public.is_staff() or (o.created_by = auth.uid() and o.status = 'new'))
  ));

create policy order_events_select on public.order_events for select to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_id and public.can_work_on_project(o.project_id)
  ));
-- Comments on an order; status rows come from the trigger.
create policy order_events_insert on public.order_events for insert to authenticated
  with check (
    actor_id = auth.uid()
    and status is null
    and exists (
      select 1 from public.orders o
      where o.id = order_id and public.can_work_on_project(o.project_id)
    )
  );

-- client access: staff manage, client reads own grants.
create policy client_access_select on public.client_access for select to authenticated
  using (public.is_staff() or client_id = auth.uid());
create policy client_access_staff on public.client_access for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- portfolio: public site shows published items.
create policy portfolio_public on public.portfolio_items for select to anon, authenticated
  using (published or public.is_staff());
create policy portfolio_staff on public.portfolio_items for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('project-photos', 'project-photos', false), ('portfolio', 'portfolio', true)
on conflict (id) do nothing;

-- project-photos/<project_id>/<file>
create policy project_photos_read on storage.objects for select to authenticated
  using (
    bucket_id = 'project-photos'
    and exists (
      select 1 from public.photos ph
      where ph.storage_path = name
        and (
          public.can_work_on_project(ph.project_id)
          or (ph.visible_to_client and public.client_can_view(ph.project_id))
        )
    )
  );
create policy project_photos_upload on storage.objects for insert to authenticated
  with check (
    bucket_id = 'project-photos'
    and public.can_work_on_project(((storage.foldername(name))[1])::uuid)
  );
create policy project_photos_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'project-photos'
    and (public.is_staff() or owner_id = auth.uid()::text)
  );

create policy portfolio_files_staff on storage.objects for all to authenticated
  using (bucket_id = 'portfolio' and public.is_staff())
  with check (bucket_id = 'portfolio' and public.is_staff());
