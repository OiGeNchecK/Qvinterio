"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { Button } from "@/components/button";
import { createClient } from "@/lib/supabase/client";
import { dateLocale, type Dictionary, type Locale } from "@/i18n";
import { Badge, Empty, ErrorNote, Field, Input, SectionHeader, Select, Textarea, emptyToNull, must, toDateInput, useLoad } from "../kit";
import {
  ORDER_STATUSES,
  isStaffPerson,
  loadPeople,
  loadProjectRefs,
  personName,
  type OrderCategory,
  type OrderStatus,
} from "../data";

type Order = {
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
  order_items: { id: string; description: string; quantity: number; unit: string }[];
};

type OrderEvent = { id: number; actor_id: string | null; status: OrderStatus | null; note: string | null; created_at: string };
type ContactRef = { id: string; company: string | null; person: string | null };

const statusTone: Record<OrderStatus, "plain" | "olive" | "gold" | "dim"> = {
  new: "gold",
  in_progress: "olive",
  ordered: "olive",
  delivered: "plain",
  cancelled: "dim",
};

async function loadAll() {
  const supabase = createClient();
  const [orders, people, projects, contacts] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id, project_id, created_by, assignee_id, contact_id, category, status, needed_by, delivery_date, note, created_at, projects(name), order_items(id, description, quantity, unit)",
      )
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
  const a = t.adminUi;

  const dateTime = new Intl.DateTimeFormat(dateLocale(locale), { dateStyle: "medium", timeStyle: "short" });
  const people = new Map(data?.people.map((p) => [p.id, p]));

  const orders = (data?.orders ?? []).filter(
    (o) =>
      (!projectFilter || o.project_id === projectFilter) &&
      (!statusFilter ||
        (statusFilter === "open" ? !["delivered", "cancelled"].includes(o.status) : o.status === statusFilter)),
  );

  return (
    <div className="space-y-6">
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
      </SectionHeader>
      <ErrorNote error={error} />

      <Card className="p-0">
        {data && !orders.length ? (
          <Empty>{t.admin.noOrders}</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {orders.map((o) => (
              <li key={o.id}>
                <button
                  onClick={() => setOpenId(openId === o.id ? null : o.id)}
                  className="grid w-full gap-2 px-5 py-4 text-left text-sm hover:bg-panel-2/60 sm:grid-cols-[1.2fr_1fr_1.6fr_auto] sm:items-center"
                >
                  <span>
                    <span className="block text-white">{o.projects?.name}</span>
                    <span className="text-xs text-silver-dim">{dateTime.format(new Date(o.created_at))}</span>
                  </span>
                  <span className="text-silver-dim">
                    {t.orderCategory[o.category]} · {personName(people.get(o.created_by ?? ""))}
                  </span>
                  <span className="truncate text-silver-dim">
                    {o.order_items.map((i) => `${i.quantity} ${i.unit} ${i.description}`).join(", ") || o.note}
                  </span>
                  <span className="flex items-center gap-2 sm:justify-end">
                    <span className="text-xs text-silver-dim">→ {personName(people.get(o.assignee_id ?? ""))}</span>
                    <Badge tone={statusTone[o.status]}>{t.orderStatus[o.status]}</Badge>
                  </span>
                </button>
                {openId === o.id && data && (
                  <OrderDetail
                    order={o}
                    t={t}
                    dateTime={dateTime}
                    dateFormatLocale={dateLocale(locale)}
                    staff={data.people.filter(isStaffPerson)}
                    people={people}
                    contacts={data.contacts}
                    onSaved={reload}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function OrderDetail({
  order,
  t,
  dateTime,
  dateFormatLocale,
  staff,
  people,
  contacts,
  onSaved,
}: {
  order: Order;
  t: Dictionary;
  dateTime: Intl.DateTimeFormat;
  dateFormatLocale: string;
  staff: { id: string; full_name: string; email: string | null }[];
  people: Map<string, { full_name: string; email: string | null }>;
  contacts: ContactRef[];
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    const { error } = await supabase
      .from("orders")
      .update({
        status: form.status,
        assignee_id: form.assignee_id || null,
        contact_id: form.contact_id || null,
        delivery_date: form.delivery_date || null,
      })
      .eq("id", order.id);
    if (!error && comment.trim()) {
      const res = await supabase.from("order_events").insert({ order_id: order.id, note: comment.trim() });
      if (res.error) setError(res.error.message);
      else setComment("");
    }
    setBusy(false);
    if (error) return setError(error.message);
    events.reload();
    onSaved();
  }

  return (
    <div className="grid gap-6 border-t border-line bg-panel-2/40 px-5 py-5 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="space-y-1 text-sm">
          {order.order_items.map((i) => (
            <div key={i.id} className="flex justify-between gap-4">
              <span className="text-silver">{i.description}</span>
              <span className="text-silver-dim">
                {i.quantity} {i.unit}
              </span>
            </div>
          ))}
          {order.needed_by && (
            <p className="pt-2 text-xs text-silver-dim">
              {a.neededBy}: {new Date(order.needed_by).toLocaleDateString(dateFormatLocale)}
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
              <option value="">–</option>
              {staff.map((p) => (
                <option key={p.id} value={p.id}>
                  {personName(p)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={a.supplier}>
            <Select value={form.contact_id} onChange={(e) => setForm({ ...form, contact_id: e.target.value })}>
              <option value="">–</option>
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
        <ErrorNote error={error} />
        <Button onClick={save} disabled={busy}>
          {a.save}
        </Button>
      </div>
      <div>
        <h3 className="mb-3 text-sm font-medium text-white">{a.history}</h3>
        <ErrorNote error={events.error} />
        <ol className="space-y-3 border-l border-line pl-4 text-sm">
          {events.data?.map((e) => (
            <li key={e.id}>
              <div className="text-xs text-silver-dim">
                {dateTime.format(new Date(e.created_at))} · {personName(people.get(e.actor_id ?? ""))}
              </div>
              <div className="text-silver">{e.status ? t.orderStatus[e.status] : emptyToNull(e.note ?? "")}</div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
