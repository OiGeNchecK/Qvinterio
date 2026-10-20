-- Workers write what they need in their own words; the office keeps that
-- text and adds its own lines (office = true) with the real item names.
alter table public.order_items add column if not exists office boolean not null default false;

-- Only staff write office lines; the author edits their own lines while
-- the order is still new.
alter policy order_items_write on public.order_items
  using (exists (
    select 1 from public.orders o
    where o.id = order_id
      and (public.is_staff() or (not office and o.created_by = auth.uid() and o.status = 'new'))
  ))
  with check (exists (
    select 1 from public.orders o
    where o.id = order_id
      and (public.is_staff() or (not office and o.created_by = auth.uid() and o.status = 'new'))
  ));

-- The author may delete an order nobody has picked up yet.
create policy orders_author_delete on public.orders for delete to authenticated
  using (created_by = auth.uid() and status = 'new' and public.can_work_on_project(project_id));
