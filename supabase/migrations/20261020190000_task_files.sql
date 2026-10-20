-- Photos, videos and files on site tasks. Staff attach them to the task
-- itself; anyone on the site team attaches them to a comment. Files live in
-- the private bucket task-files/<project_id>/<task_id>/<file>, max 50 MB each
-- (the upload limit of the Supabase free plan).

insert into storage.buckets (id, name, public, file_size_limit)
values ('task-files', 'task-files', false, 52428800)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

create table public.site_task_files (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.site_tasks (id) on delete cascade,
  -- Null: attached to the task by staff; set: part of a comment.
  comment_id bigint references public.site_task_comments (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null default auth.uid(),
  storage_path text not null unique,
  name text not null,
  mime text,
  size bigint,
  created_at timestamptz not null default now()
);

create index on public.site_task_files (task_id);
create index on public.site_task_files (comment_id);

-- A comment may consist of attachments only.
alter table public.site_task_comments drop constraint site_task_comments_check;
alter policy site_task_comments_insert on public.site_task_comments
  with check (
    author_id = auth.uid()
    and status is null
    and exists (
      select 1 from public.site_tasks t
      where t.id = task_id and public.can_work_on_project(t.project_id)
    )
  );

alter table public.site_task_files enable row level security;

create policy site_task_files_select on public.site_task_files for select to authenticated
  using (exists (
    select 1 from public.site_tasks t
    where t.id = task_id and public.can_work_on_project(t.project_id)
  ));
create policy site_task_files_insert on public.site_task_files for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.site_tasks t
      where t.id = task_id
        and public.can_work_on_project(t.project_id)
        and storage_path like t.project_id::text || '/' || t.id::text || '/%'
    )
    and (
      (comment_id is null and public.is_staff())
      or exists (
        select 1 from public.site_task_comments c
        where c.id = comment_id and c.task_id = site_task_files.task_id and c.author_id = auth.uid()
      )
    )
  );
create policy site_task_files_delete on public.site_task_files for delete to authenticated
  using (public.is_staff() or author_id = auth.uid());

create policy task_files_read on storage.objects for select to authenticated
  using (
    bucket_id = 'task-files'
    and exists (
      select 1 from public.site_task_files f
      join public.site_tasks t on t.id = f.task_id
      where f.storage_path = name and public.can_work_on_project(t.project_id)
    )
  );
create policy task_files_upload on storage.objects for insert to authenticated
  with check (
    bucket_id = 'task-files'
    and public.can_work_on_project(((storage.foldername(name))[1])::uuid)
  );
create policy task_files_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'task-files'
    and (public.is_staff() or owner_id = auth.uid()::text)
  );
