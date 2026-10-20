"use client";

import { useState } from "react";
import { BookOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/button";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/auth";
import { dateLocale, type Dictionary, type Locale } from "@/i18n";
import {
  EmptyRow,
  ErrorNote,
  Field,
  IconButton,
  Input,
  Modal,
  ModalActions,
  Panel,
  SectionHeader,
  Select,
  StatusMenu,
  Table,
  Textarea,
  must,
  toDateInput,
  useLoad,
} from "../kit";
import {
  ORDER_STATUSES,
  isStaffPerson,
  loadPeople,
  loadProjectRefs,
  orderStatusTone,
  personName,
  type OrderCategory,
  type OrderStatus,
  type Person,
} from "../data";
import { CUSTOM, CatalogModal, ItemLines, NewOrderModal, linesToItems, loadCatalog, type Line } from "./new-order";

export type Order = {
  id: string;
  project_id: string;
  created_by: string | null;
  assignee_id: string | null;
  contact_id: string | null;
  category: OrderCategory;
  status: OrderStatus;
  needed_by: string | null;
  delivery_date: string | null;
  note: string | null;
  created_at: string;
  projects: { name: string } | null;
  order_items: OrderItem[];
};

// office = a line the office added when it adjusted the order.
export type OrderItem = { id: string; description: string; quantity: number; unit: string; office: boolean };

type OrderEvent = { id: number; actor_id: string | null; status: OrderStatus | null; note: string | null; created_at: string };
export type ContactRef = { id: string; company: string | null; person: string | null };

export const ORDER_SELECT =
  "id, project_id, created_by, assignee_id, contact_id, category, status, needed_by, delivery_date, note, created_at, projects(name), order_items(id, description, quantity, unit, office)";

async function loadAll() {
  const supabase = createClient();
  const [orders, people, projects, contacts] = await Promise.all([
    supabase
      .from("orders")
      .select(ORDER_SELECT)
      .order("created_at", { ascending: false })
      .limit(500)
      .overrideTypes<Order[], { merge: false }>(),
    loadPeople(),
    loadProjectRefs(),
    supabase.from("contacts").select("id, company, person").order("company"),
  ]);
  return {
    orders: must<Order[]>(orders),
    people,
    projects,
    contacts: must<ContactRef[]>(contacts),
  };
}

export function OrdersSection({ locale, t }: { locale: Locale; t: Dictionary }) {
  const { data, error, reload } = useLoad(loadAll);
  // Links from a site page arrive as ?project=<id>. The guard in the admin
  // layout renders this only in the browser, so window is available.
  const [linkedProject] = useState(() => new URLSearchParams(window.location.search).get("project") ?? "");
  const [projectFilter, setProjectFilter] = useState(linkedProject);
  const [statusFilter, setStatusFilter] = useState<"" | "open" | OrderStatus>(linkedProject ? "" : "open");
  const [openId, setOpenId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"new" | "catalog" | null>(null);
  const a = t.adminUi;

  const orders = (data?.orders ?? []).filter(
    (o) =>
      (!projectFilter || o.project_id === projectFilter) &&
      (!statusFilter ||
        (statusFilter === "open" ? !["delivered", "cancelled"].includes(o.status) : o.status === statusFilter)),
  );
  const opened = data?.orders.find((o) => o.id === openId);

  return (
    <div>
      <SectionHeader title={t.admin.sections.orders}>
        <Select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="w-auto">
          <option value="">{a.allProjects}</option>
          {data?.projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="w-auto"
        >
          <option value="open">{a.openOrders}</option>
          <option value="">{a.allStatuses}</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t.orderStatus[s]}
            </option>
          ))}
        </Select>
        <Button variant="ghost" onClick={() => setDialog("catalog")}>
          <BookOpen size={16} /> {a.catalog}
        </Button>
        <Button onClick={() => setDialog("new")}>
          <Plus size={16} /> {a.newOrder}
        </Button>
      </SectionHeader>
      <ErrorNote error={error} />

      <Panel>
        <OrdersTable
          orders={orders}
          people={data?.people ?? []}
          locale={locale}
          t={t}
          onOpen={setOpenId}
          onChanged={reload}
          loaded={!!data}
        />
      </Panel>

      {dialog === "new" && data && (
        <NewOrderModal
          t={t}
          projects={data.projects}
          contacts={data.contacts}
          onClose={() => setDialog(null)}
          onSaved={reload}
        />
      )}
      {dialog === "catalog" && <CatalogModal t={t} onClose={() => setDialog(null)} />}

      {opened && data && (
        <OrderModal
          order={opened}
          t={t}
          locale={locale}
          people={data.people}
          contacts={data.contacts}
          onClose={() => setOpenId(null)}
          onSaved={reload}
        />
      )}
    </div>
  );
}

// The office's adjusted lines when there are any, otherwise the original ones.
export function shownItems(o: Pick<Order, "order_items">) {
  const office = o.order_items.filter((i) => i.office);
  return office.length ? office : o.order_items;
}

// Shared by the orders page and the overview.
export function OrdersTable({
  orders,
  people,
  locale,
  t,
  onOpen,
  onChanged,
  loaded,
}: {
  orders: Order[];
  people: Person[];
  locale: Locale;
  t: Dictionary;
  onOpen: (id: string) => void;
  onChanged: () => void;
  loaded: boolean;
}) {
  const a = t.adminUi;
  const me = useUser();
  const [error, setError] = useState<string | null>(null);
  const byId = new Map(people.map((p) => [p.id, p]));
  const staff = people.filter(isStaffPerson);
  const dateTime = new Intl.DateTimeFormat(dateLocale(locale), { dateStyle: "short", timeStyle: "short" });
  const date = new Intl.DateTimeFormat(dateLocale(locale), { dateStyle: "short" });

  async function update(id: string, patch: Partial<Order>) {
    const { error } = await createClient().from("orders").update(patch).eq("id", id);
    setError(error?.message ?? null);
    onChanged();
  }

  async function remove(o: Order) {
    if (!window.confirm(a.confirmDelete)) return;
    const { error } = await createClient().from("orders").delete().eq("id", o.id);
    setError(error?.message ?? null);
    onChanged();
  }

  return (
    <>
      <ErrorNote error={error} />
      <Table head={[a.date, t.adminUi.site, a.category, a.items, a.orderedBy, a.assignee, a.status, ""]}>
        {orders.map((o) => (
          <tr key={o.id}>
            <td className="whitespace-nowrap text-xs text-silver-dim">
              {dateTime.format(new Date(o.created_at))}
              {o.needed_by && (
                <div className="mt-1 text-gold">
                  {a.neededBy} {date.format(new Date(o.needed_by))}
                </div>
              )}
            </td>
            <td className="min-w-32 text-white">{o.projects?.name}</td>
            <td className="text-silver-dim">{t.orderCategory[o.category]}</td>
            <td>
              {o.order_items.length ? (
                shownItems(o).map((i) => (
                  <div key={i.id} className="text-xs">
                    {i.description} <span className="text-silver-dim">×{i.quantity} {i.unit}</span>
                  </div>
                ))
              ) : (
                <span className="text-xs text-silver-dim">{o.note ?? "—"}</span>
              )}
            </td>
            <td className="text-silver-dim">{personName(byId.get(o.created_by ?? ""))}</td>
            <td>
              <Select
                value={o.assignee_id ?? ""}
                onChange={(e) => update(o.id, { assignee_id: e.target.value || null })}
                className="w-auto py-1 text-xs"
              >
                <option value="">—</option>
                {staff.map((p) => (
                  <option key={p.id} value={p.id}>
                    {personName(p)}
                  </option>
                ))}
              </Select>
            </td>
            <td>
              <StatusMenu
                value={o.status}
                options={ORDER_STATUSES}
                label={(s) => t.orderStatus[s]}
                tone={orderStatusTone}
                onChange={(status) => update(o.id, { status })}
              />
            </td>
            <td>
              <div className="flex justify-end gap-1.5">
                <IconButton onClick={() => onOpen(o.id)} title={a.details}>
                  <Pencil size={14} />
                </IconButton>
                {me.roles.includes("admin") && (
                  <IconButton danger onClick={() => remove(o)} title={a.delete}>
                    <Trash2 size={14} />
                  </IconButton>
                )}
              </div>
            </td>
          </tr>
        ))}
        {loaded && !orders.length && <EmptyRow cols={8}>{t.admin.noOrders}</EmptyRow>}
      </Table>
    </>
  );
}

export function OrderModal({
  order,
  t,
  locale,
  people,
  contacts,
  onClose,
  onSaved,
}: {
  order: Order;
  t: Dictionary;
  locale: Locale;
  people: Person[];
  contacts: ContactRef[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const a = t.adminUi;
  const [form, setForm] = useState({
    status: order.status,
    assignee_id: order.assignee_id ?? "",
    contact_id: order.contact_id ?? "",
    delivery_date: toDateInput(order.delivery_date),
  });
  const [comment, setComment] = useState("");
  const catalog = useLoad(loadCatalog);
  const original = order.order_items.filter((i) => !i.office);
  const adjusted = order.order_items.filter((i) => i.office);
  // The office edits a copy; the original lines stay as they were written.
  const startLines = (adjusted.length ? adjusted : original).map(
    (i): Line => ({ pick: CUSTOM, text: i.description, quantity: String(i.quantity), unit: i.unit }),
  );
  const [lines, setLines] = useState<Line[]>(startLines);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const byId = new Map(people.map((p) => [p.id, p]));
  const dateTime = new Intl.DateTimeFormat(dateLocale(locale), { dateStyle: "medium", timeStyle: "short" });
  const date = new Intl.DateTimeFormat(dateLocale(locale), { dateStyle: "medium" });
  const events = useLoad(async () =>
    must<OrderEvent[]>(
      await createClient()
        .from("order_events")
        .select("id, actor_id, status, note, created_at")
        .eq("order_id", order.id)
        .order("created_at"),
    ),
  );

  async function save() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const items = linesToItems(lines, catalog.data ?? []);
    const key = (list: { description: string; quantity: number; unit: string }[]) =>
      JSON.stringify(list.map((i) => [i.description, Number(i.quantity), i.unit]));
    const linesChanged = key(items) !== key(adjusted.length ? adjusted : original);
    try {
      if (linesChanged) {
        must(await supabase.from("order_items").delete().eq("order_id", order.id).eq("office", true));
        if (items.length)
          must(await supabase.from("order_items").insert(items.map((i) => ({ ...i, order_id: order.id, office: true }))));
        must(await supabase.from("order_events").insert({ order_id: order.id, note: a.itemsAdjusted }));
      }
      must(
        await supabase
          .from("orders")
          .update({
            // Adjusting a new order means the office has picked it up.
            status: linesChanged && form.status === "new" ? "in_progress" : form.status,
            assignee_id: form.assignee_id || null,
            contact_id: form.contact_id || null,
            delivery_date: form.delivery_date || null,
          })
          .eq("id", order.id),
      );
      if (comment.trim()) must(await supabase.from("order_events").insert({ order_id: order.id, note: comment.trim() }));
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <Modal title={`${order.projects?.name ?? ""} · ${t.orderCategory[order.category]}`} onClose={onClose} wide>
      <div className="grid gap-6 md:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          <div className="space-y-1 rounded-lg bg-panel-2 p-4 text-sm">
            <div className="mb-2 text-xs text-silver-dim">
              {a.originalRequest} · {personName(byId.get(order.created_by ?? ""))}
            </div>
            {original.map((i) => (
              <div key={i.id} className="flex justify-between gap-4">
                <span className="text-silver">{i.description}</span>
                <span className="whitespace-nowrap text-silver-dim">
                  {i.quantity} {i.unit}
                </span>
              </div>
            ))}
            {order.needed_by && (
              <p className="pt-2 text-xs text-gold">
                {a.neededBy}: {date.format(new Date(order.needed_by))}
              </p>
            )}
            {order.note && <p className="pt-2 text-silver-dim">{order.note}</p>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={a.status}>
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as OrderStatus })}>
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t.orderStatus[s]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={a.assignee}>
              <Select value={form.assignee_id} onChange={(e) => setForm({ ...form, assignee_id: e.target.value })}>
                <option value="">—</option>
                {people.filter(isStaffPerson).map((p) => (
                  <option key={p.id} value={p.id}>
                    {personName(p)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={a.supplier}>
              <Select value={form.contact_id} onChange={(e) => setForm({ ...form, contact_id: e.target.value })}>
                <option value="">—</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {[c.company, c.person].filter(Boolean).join(" · ")}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={a.deliveryDate}>
              <Input
                type="date"
                value={form.delivery_date}
                onChange={(e) => setForm({ ...form, delivery_date: e.target.value })}
              />
            </Field>
          </div>
          <Field label={a.comment}>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} />
          </Field>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-gold">{a.history}</h4>
          <ErrorNote error={events.error} />
          <ol className="space-y-3 border-l border-line pl-4 text-sm">
            {events.data?.map((e) => (
              <li key={e.id}>
                <div className="text-xs text-silver-dim">
                  {dateTime.format(new Date(e.created_at))} · {personName(byId.get(e.actor_id ?? ""))}
                </div>
                <div className="text-silver">{e.status ? t.orderStatus[e.status] : e.note}</div>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <div className="mt-6 rounded-xl border border-gold/40 bg-gold/5 p-4">
        <h4 className="text-xs font-medium uppercase tracking-wider text-gold">{a.adjustItems}</h4>
        <p className="mb-3 mt-1 text-xs text-silver-dim">{a.adjustItemsHint}</p>
        <ItemLines t={t} category={order.category} catalog={catalog.data ?? []} lines={lines} setLines={setLines} />
        <ErrorNote error={catalog.error} />
      </div>
      <ErrorNote error={error} />
      <ModalActions>
        <Button variant="ghost" onClick={onClose}>
          {a.cancel}
        </Button>
        <Button onClick={save} disabled={busy}>
          {a.save}
        </Button>
      </ModalActions>
    </Modal>
  );
}
