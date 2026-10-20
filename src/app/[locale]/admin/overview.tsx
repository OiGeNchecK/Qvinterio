"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, HardHat, Inbox, KeyRound, MessageSquare, ShoppingCart, Truck, X } from "lucide-react";
import { ProgressBar } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { Dictionary, Locale } from "@/i18n";
import { Badge, EmptyRow, ErrorNote, IconButton, Panel, SectionHeader, StatCard, Table, must, useLoad } from "./kit";
import { loadPeople, personName, projectStatusTone, type ProjectStatus } from "./data";
import { ORDER_SELECT, OrderModal, OrdersTable, type Order } from "./panels/orders";
import { loadSitePhotos } from "./panels/photos";

type Project = { id: string; name: string; address: string | null; status: ProjectStatus; progress: number; manager_id: string | null };
type ContactRef = { id: string; company: string | null; person: string | null };
type View = "new" | "open" | "projects" | null;

async function loadAll() {
  const supabase = createClient();
  const [orders, projects, people, access, contacts, notes, requests] = await Promise.all([
    supabase
      .from("orders")
      .select(ORDER_SELECT)
      .not("status", "in", "(delivered,cancelled)")
      .order("created_at", { ascending: false })
      .overrideTypes<Order[], { merge: false }>(),
    supabase.from("projects").select("id, name, address, status, progress, manager_id").eq("status", "active").order("name"),
    loadPeople(),
    supabase
      .from("client_access")
      .select("id", { count: "exact", head: true })
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString()),
    supabase.from("contacts").select("id, company, person").order("company"),
    supabase.from("client_notes").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("contact_requests").select("id", { count: "exact", head: true }).eq("status", "new"),
  ]);
  return {
    openOrders: must<Order[]>(orders),
    activeProjects: must<Project[]>(projects),
    people,
    activeAccess: access.count ?? 0,
    contacts: must<ContactRef[]>(contacts),
    openNotes: notes.count ?? 0,
    newRequests: requests.count ?? 0,
  };
}

export function AdminOverview({ locale, t }: { locale: Locale; t: Dictionary }) {
  const { data, error, reload } = useLoad(loadAll);
  const latestPhotos = useLoad(() => loadSitePhotos({}, 8));
  const [view, setView] = useState<View>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const router = useRouter();
  const a = t.adminUi;

  const newOrders = data?.openOrders.filter((o) => o.status === "new") ?? [];
  const team = data?.people.filter((p) => p.active && p.roles.includes("worker")) ?? [];
  const byId = new Map(data?.people.map((p) => [p.id, p]));
  const toggle = (v: View) => setView(view === v ? null : v);
  const opened = data?.openOrders.find((o) => o.id === openId);

  const ordersTable = (orders: Order[]) => (
    <OrdersTable
      orders={orders}
      people={data?.people ?? []}
      locale={locale}
      t={t}
      onOpen={setOpenId}
      onChanged={reload}
      loaded={!!data}
    />
  );
  const close = (
    <IconButton onClick={() => setView(null)} aria-label="Close">
      <X size={14} />
    </IconButton>
  );

  return (
    <div>
      <SectionHeader title={t.admin.sections.overview} />
      <ErrorNote error={error} />

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-7">
        <StatCard
          icon={<ShoppingCart size={24} />}
          value={data ? newOrders.length : "–"}
          label={t.admin.newOrders}
          active={view === "new"}
          onClick={() => toggle("new")}
        />
        <StatCard
          icon={<Truck size={24} />}
          value={data?.openOrders.length ?? "–"}
          label={a.openOrdersLong}
          active={view === "open"}
          onClick={() => toggle("open")}
        />
        <StatCard
          icon={<Building2 size={24} />}
          value={data?.activeProjects.length ?? "–"}
          label={t.admin.activeProjects}
          active={view === "projects"}
          onClick={() => toggle("projects")}
        />
        <StatCard
          icon={<MessageSquare size={24} />}
          value={data?.openNotes ?? "–"}
          label={t.notes.openCount}
          onClick={() => router.push(`/${locale}/admin/notes/`)}
        />
        <StatCard
          icon={<Inbox size={24} />}
          value={data?.newRequests ?? "–"}
          label={t.requests.newCount}
          onClick={() => router.push(`/${locale}/admin/requests/`)}
        />
        <StatCard icon={<HardHat size={24} />} value={data ? team.length : "–"} label={a.teamCount} />
        <StatCard icon={<KeyRound size={24} />} value={data?.activeAccess ?? "–"} label={a.activeAccess} />
      </div>

      {view === "new" && (
        <Panel title={`${t.admin.newOrders} (${newOrders.length})`} actions={close}>
          {ordersTable(newOrders)}
        </Panel>
      )}
      {view === "open" && (
        <Panel title={`${a.openOrdersLong} (${data?.openOrders.length ?? 0})`} actions={close}>
          {ordersTable(data?.openOrders ?? [])}
        </Panel>
      )}
      {view === "projects" && (
        <Panel title={`${t.admin.activeProjects} (${data?.activeProjects.length ?? 0})`} actions={close}>
          <Table head={[a.name, a.address, a.siteManager, t.common.progress, a.status]}>
            {data?.activeProjects.map((p) => (
              <tr key={p.id}>
                <td className="text-white">{p.name}</td>
                <td className="text-silver-dim">{p.address}</td>
                <td className="text-silver-dim">{personName(byId.get(p.manager_id ?? ""))}</td>
                <td className="w-40">
                  <div className="mb-1 text-xs text-silver-dim">{p.progress}%</div>
                  <ProgressBar value={p.progress} />
                </td>
                <td>
                  <Badge tone={projectStatusTone(p.status)}>{a.projectStatus[p.status]}</Badge>
                </td>
              </tr>
            ))}
            {data && !data.activeProjects.length && <EmptyRow cols={5}>{a.noProjects}</EmptyRow>}
          </Table>
        </Panel>
      )}

      {!view && newOrders.length > 0 && (
        <Panel title={`⚠ ${t.admin.newOrders} (${newOrders.length})`} className="border-gold/60">
          {ordersTable(newOrders.slice(0, 5))}
        </Panel>
      )}
      {!view && (
        <Panel title={a.openOrdersLong}>{ordersTable((data?.openOrders ?? []).slice(0, 10))}</Panel>
      )}

      {!view && !!latestPhotos.data?.length && (
        <Panel
          title={t.sitePhotos.latest}
          actions={
            <Link href={`/${locale}/admin/photos/`} className="text-sm text-gold hover:underline">
              {t.notes.filterAll} →
            </Link>
          }
        >
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {latestPhotos.data.map((p) => (
              <Link
                key={p.id}
                href={`/${locale}/admin/photos/?project=${p.project_id}`}
                title={`${p.project?.name ?? ""} · ${personName(p.author)}`}
                className="relative block aspect-square overflow-hidden rounded-lg border border-line bg-panel-2 hover:border-gold"
              >
                {p.url && <Image src={p.url} alt={p.caption ?? ""} fill sizes="12vw" className="object-cover" />}
              </Link>
            ))}
          </div>
        </Panel>
      )}

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
