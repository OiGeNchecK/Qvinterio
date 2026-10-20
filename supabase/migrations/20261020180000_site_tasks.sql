-- Tasks per site. Admins and the Bauleiter (staff) write tasks with a period
-- and a status; the site's team sees them, sets the progress status and
-- comments. Every status change is written to the task's comment thread.

create type public.task_status as enum ('open', 'in_progress', 'blocked', 'done');

create table public.site_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 300),
  description text,
  status public.task_status not null default 'open',
  start_date date,
  end_date date check (end_date is null or start_date is null or end_date >= start_date),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.site_task_comments (
  id bigint generated always as identity primary key,
  task_id uuid not null references public.site_tasks (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null default auth.uid(),
  -- Set for status changes (written by trigger), null for comments.
  status public.task_status,
  body text check (body is null or length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  check (status is not null or body is not null)
);

create index on public.site_tasks (project_id, start_date);
create index on public.site_task_comments (task_id, created_at);

create trigger site_tasks_touch before update on public.site_tasks
  for each row execute function public.touch_updated_at();

-- The team may only change the status; everything else stays as staff set it.
create function public.site_task_guard()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  s public.task_status;
begin
  if not public.is_staff() then
    s := new.status;
    new := old;
    new.status := s;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create trigger site_tasks_guard before update on public.site_tasks
  for each row execute function public.site_task_guard();

create function public.log_site_task_status()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    insert into public.site_task_comments (task_id, author_id, status)
    values (new.id, auth.uid(), new.status);
  end if;
  return new;
end;
$$;

create trigger site_tasks_log_status after update of status on public.site_tasks
  for each row execute function public.log_site_task_status();

revoke execute on function public.site_task_guard() from public, anon, authenticated;
revoke execute on function public.log_site_task_status() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.site_tasks enable row level security;
alter table public.site_task_comments enable row level security;

create policy site_tasks_select on public.site_tasks for select to authenticated
  using (public.can_work_on_project(project_id));
create policy site_tasks_staff on public.site_tasks for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
-- Team members set the status (the guard trigger keeps the other fields).
create policy site_tasks_team_update on public.site_tasks for update to authenticated
  using (public.is_project_member(project_id))
  with check (public.is_project_member(project_id));

create policy site_task_comments_select on public.site_task_comments for select to authenticated
  using (exists (
    select 1 from public.site_tasks t
    where t.id = task_id and public.can_work_on_project(t.project_id)
  ));
create policy site_task_comments_insert on public.site_task_comments for insert to authenticated
  with check (
    author_id = auth.uid()
    and status is null
    and body is not null
    and exists (
      select 1 from public.site_tasks t
      where t.id = task_id and public.can_work_on_project(t.project_id)
    )
  );
create policy site_task_comments_delete on public.site_task_comments for delete to authenticated
  using (public.is_staff() or (author_id = auth.uid() and status is null));
