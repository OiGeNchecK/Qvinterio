-- Clients leave markers on photos (note or question) and write messages to
-- the firm from their site page. Staff answer in a thread. Every new note
-- and reply creates in-app notifications: client posts go to all admins and
-- the site's Bauleiter (projects.manager_id), staff replies go to the client.
--
-- E-mail later: rows in public.notifications with emailed_at is null are the
-- outbox. A database webhook or scheduled edge function can send them (e.g.
-- through Microsoft Graph / Outlook) and set emailed_at.

create type public.note_kind as enum ('note', 'question', 'message');
create type public.note_status as enum ('open', 'done');

create table public.client_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null default auth.uid(),
  -- Marker on a photo: position relative to the image, 0..1 from top left.
  photo_id uuid references public.photos (id) on delete cascade,
  pos_x real check (pos_x between 0 and 1),
  pos_y real check (pos_y between 0 and 1),
  kind public.note_kind not null default 'note',
  body text not null check (length(btrim(body)) between 1 and 4000),
  status public.note_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Messages stand alone; notes and questions sit on a spot of a photo.
  check ((kind = 'message') = (photo_id is null)),
  check ((photo_id is null) = (pos_x is null) and (photo_id is null) = (pos_y is null))
);

create table public.client_note_replies (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.client_notes (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null default auth.uid(),
  -- Set by trigger; clients cannot read staff profiles, so this names the side.
  by_staff boolean not null default false,
  body text not null check (length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  note_id uuid references public.client_notes (id) on delete cascade,
  reply_id uuid references public.client_note_replies (id) on delete cascade,
  kind text not null check (kind in ('note', 'reply')),
  read_at timestamptz,
  emailed_at timestamptz,
  created_at timestamptz not null default now()
);

create index on public.client_notes (project_id, created_at desc);
create index on public.client_notes (photo_id);
create index on public.client_note_replies (note_id, created_at);
create index on public.notifications (user_id, read_at);
create index on public.notifications (note_id);

create trigger client_notes_touch before update on public.client_notes
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------

-- Active admins and the site's Bauleiter, without the person who wrote.
create function public.notify_site_staff(pid uuid, nid uuid, rid uuid, k text, skip uuid)
returns void language sql security definer set search_path = ''
as $$
  insert into public.notifications (user_id, project_id, note_id, reply_id, kind)
  select distinct u.id, pid, nid, rid, k
  from (
    select ur.user_id as id from public.user_roles ur where ur.role = 'admin'
    union
    select p.manager_id from public.projects p where p.id = pid
  ) u
  join public.profiles pr on pr.id = u.id and pr.active
  where u.id is distinct from skip;
$$;

create function public.client_note_created()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform public.notify_site_staff(new.project_id, new.id, null, 'note', new.author_id);
  return new;
end;
$$;

create trigger client_notes_notify after insert on public.client_notes
  for each row execute function public.client_note_created();

create function public.client_reply_prepare()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  new.by_staff := public.is_staff();
  return new;
end;
$$;

create trigger client_note_replies_prepare before insert on public.client_note_replies
  for each row execute function public.client_reply_prepare();

create function public.client_reply_created()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  n public.client_notes;
begin
  select * into n from public.client_notes where id = new.note_id;
  if new.by_staff then
    if n.author_id is not null and n.author_id is distinct from new.author_id then
      insert into public.notifications (user_id, project_id, note_id, reply_id, kind)
      values (n.author_id, n.project_id, n.id, new.id, 'reply');
    end if;
  else
    -- A client answer opens the topic again.
    update public.client_notes set status = 'open' where id = n.id and status <> 'open';
    perform public.notify_site_staff(n.project_id, n.id, new.id, 'reply', new.author_id);
  end if;
  return new;
end;
$$;

create trigger client_note_replies_notify after insert on public.client_note_replies
  for each row execute function public.client_reply_created();

revoke execute on function public.notify_site_staff(uuid, uuid, uuid, text, uuid) from public, anon, authenticated;
revoke execute on function public.client_note_created() from public, anon, authenticated;
revoke execute on function public.client_reply_prepare() from public, anon, authenticated;
revoke execute on function public.client_reply_created() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.client_notes enable row level security;
alter table public.client_note_replies enable row level security;
alter table public.notifications enable row level security;

-- Staff and every client with valid access to the site.
create policy client_notes_select on public.client_notes for select to authenticated
  using (public.is_staff() or public.client_can_view(project_id));
create policy client_notes_insert on public.client_notes for insert to authenticated
  with check (
    author_id = auth.uid()
    and status = 'open'
    and public.client_can_view(project_id)
    and (
      photo_id is null
      or exists (
        select 1 from public.photos ph
        where ph.id = photo_id and ph.project_id = client_notes.project_id and ph.visible_to_client
      )
    )
  );
create policy client_notes_staff on public.client_notes for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy client_notes_delete on public.client_notes for delete to authenticated
  using (public.is_staff() or (author_id = auth.uid() and public.client_can_view(project_id)));

create policy client_note_replies_select on public.client_note_replies for select to authenticated
  using (exists (
    select 1 from public.client_notes n
    where n.id = note_id and (public.is_staff() or public.client_can_view(n.project_id))
  ));
create policy client_note_replies_insert on public.client_note_replies for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.client_notes n
      where n.id = note_id and (public.is_staff() or public.client_can_view(n.project_id))
    )
  );
create policy client_note_replies_delete on public.client_note_replies for delete to authenticated
  using (author_id = auth.uid() or public.is_staff());

-- Everyone reads and marks their own notifications; rows come from triggers.
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke insert, update, delete on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;
