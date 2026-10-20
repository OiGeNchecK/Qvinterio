"use client";

import { useState } from "react";
import { History, Plus } from "lucide-react";
import { Button } from "@/components/button";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/auth";
import { dateLocale, type Dictionary, type Locale } from "@/i18n";
import { Badge, ErrorNote, must, useLoad } from "../admin/kit";
import { orderStatusTone, personName, type OrderCategory, type OrderStatus } from "../admin/data";
import { NewOrderModal } from "../admin/panels/new-order";
import type { WorkerSite } from "./worker-home";

type SiteOrder = {
  id: string;
  created_by: string | null;
  category: OrderCategory;
  status: OrderStatus;
  needed_by: string | null;
  delivery_date: string | null;
  note: string | null;
  created_at: string;
  order_items: { id: string; description: string; quantity: number; unit: string }[];
};

type OrderEvent = { id: number; actor_id: string | null; status: OrderStatus | null; note: string | null; created_at: string };
type Profile = { id: string; full_name: string; email: string | null };

async function loadOrders(projectId: string) {
  const supabase = createClient();
  const orders = must<SiteOrder[]>(
    await supabase
      .from("orders")
      .select(
        "id, created_by, category, status, needed_by, delivery_date, note, created_at, order_items(id, description, quantity, unit)",
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(200),
  );
  const ids = [...new Set(orders.map((o) => o.created_by).filter((id): id is string => !!id))];
  const people = ids.length
    ? must<Profile[]>(await supabase.from("profiles").select("id, full_name, email").in("id", ids))
    : [];
  return { orders, people: new Map(people.map((p) => [p.id, p])) };
}

// Order history of one site, newest first, and the order form.
export function SiteOrders({
  site,
  locale,
  t,
  onChanged,
}: {
  site: WorkerSite;
  locale: Locale;
  t: Dictionary;
  onChanged: () => void;
}) {
  const w = t.worker;
  const a = t.adminUi;
  const me = useUser();
  const { data, error, reload } = useLoad(() => loadOrders(site.id));
  const [ordering, setOrdering] = useState(false);
  const [sent, setSent] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const dateTime = new Intl.DateTimeFormat(dateLocale(locale), { dateStyle: "short", timeStyle: "short" });
  const date = new Intl.DateTimeFormat(dateLocale(locale), { dateStyle: "short" });

  async function cancel(o: SiteOrder) {
    if (!window.confirm(w.confirmCancel)) return;
    const { error } = await createClient().from("orders").update({ status: "cancelled" }).eq("id", o.id);
    setActionError(error?.message ?? null);
    reload();
    onChanged();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          onClick={() => {
            setSent(false);
            setOrdering(true);
          }}
        >
          <Plus size={16} /> {w.newOrder}
        </Button>
      </div>
      {sent && (
        <p className="rounded-lg border border-emerald-800/60 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-300">
          {w.orderSent}
        </p>
      )}
      <ErrorNote error={error ?? actionError} />

      {data && !data.orders.length && (
        <p className="rounded-xl border border-line bg-panel/70 px-4 py-6 text-center text-sm text-silver-dim">{w.noOrders}</p>
      )}
      <ul className="space-y-3">
        {data?.orders.map((o) => {
          const mine = o.created_by === me.id;
          return (
            <li key={o.id} className="rounded-xl border border-line bg-panel/80 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="text-xs text-silver-dim">
                  {dateTime.format(new Date(o.created_at))} · {t.orderCategory[o.category]} ·{" "}
                  {mine ? w.byMe : personName(data.people.get(o.created_by ?? ""))}
                </div>
                <Badge tone={orderStatusTone(o.status)}>{t.orderStatus[o.status]}</Badge>
              </div>
              <div className="mt-3 space-y-1 text-sm">
                {o.order_items.map((i) => (
                  <div key={i.id} className="flex justify-between gap-4">
                    <span className="text-silver">{i.description}</span>
                    <span className="whitespace-nowrap text-silver-dim">
                      {i.quantity} {i.unit}
                    </span>
                  </div>
                ))}
              </div>
              {o.note && <p className="mt-2 text-sm text-silver-dim">{o.note}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                {o.needed_by && (
                  <span className="text-gold">
                    {a.neededBy} {date.format(new Date(o.needed_by))}
                  </span>
                )}
                {o.delivery_date && (
                  <span className="text-emerald-300">
                    {w.deliveryOn} {date.format(new Date(o.delivery_date))}
                  </span>
                )}
                <span className="ml-auto flex gap-3">
                  <button
                    onClick={() => setOpenId(openId === o.id ? null : o.id)}
                    className="inline-flex items-center gap-1 text-silver-dim hover:text-gold"
                  >
                    <History size={13} /> {w.history}
                  </button>
                  {mine && o.status === "new" && (
                    <button onClick={() => cancel(o)} className="text-red-400 hover:underline">
                      {w.cancelOrder}
                    </button>
                  )}
                </span>
              </div>
              {openId === o.id && <OrderHistory orderId={o.id} locale={locale} t={t} />}
            </li>
          );
        })}
      </ul>

      {ordering && (
        <NewOrderModal
          t={t}
          projects={[site]}
          projectId={site.id}
          onClose={() => setOrdering(false)}
          onSaved={() => {
            setSent(true);
            reload();
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function OrderHistory({ orderId, locale, t }: { orderId: string; locale: Locale; t: Dictionary }) {
  const dateTime = new Intl.DateTimeFormat(dateLocale(locale), { dateStyle: "short", timeStyle: "short" });
  const { data, error } = useLoad(async () => {
    const supabase = createClient();
    const events = must<OrderEvent[]>(
      await supabase
        .from("order_events")
        .select("id, actor_id, status, note, created_at")
        .eq("order_id", orderId)
        .order("created_at"),
    );
    const ids = [...new Set(events.map((e) => e.actor_id).filter((id): id is string => !!id))];
    const people = ids.length
      ? must<Profile[]>(await supabase.from("profiles").select("id, full_name, email").in("id", ids))
      : [];
    return { events, people: new Map(people.map((p) => [p.id, p])) };
  });

  return (
    <div className="mt-3 border-t border-line pt-3">
      <ErrorNote error={error} />
      <ol className="space-y-2 border-l border-line pl-4 text-sm">
        {data?.events.map((e) => (
          <li key={e.id}>
            <div className="text-xs text-silver-dim">
              {dateTime.format(new Date(e.created_at))} · {personName(data.people.get(e.actor_id ?? ""))}
            </div>
            <div className="text-silver">{e.status ? t.orderStatus[e.status] : e.note}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}
