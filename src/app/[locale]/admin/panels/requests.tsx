"use client";

import { useEffect, useState } from "react";
import { Mail, Phone, Trash2 } from "lucide-react";
import { ButtonLink } from "@/components/button";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/auth";
import { dateLocale, type Dictionary, type Locale } from "@/i18n";
import { ErrorNote, IconButton, Modal, ModalActions, Panel, SectionHeader, StatusMenu, must, useLoad, type Tone } from "../kit";
import { loadPeople, personName, type Person } from "../data";

export type RequestStatus = "new" | "in_progress" | "done";
const STATUSES: readonly RequestStatus[] = ["new", "in_progress", "done"];
const TONES: Record<RequestStatus, Tone> = { new: "amber", in_progress: "sky", done: "green" };

type ContactRequest = {
  id: string;
  name: string;
  company: string | null;
  email: string;
  phone: string | null;
  message: string;
  status: RequestStatus;
  handled_by: string | null;
  created_at: string;
};

const CHANGED_EVENT = "qv:contact-requests";

// Number of new contact form messages, for the sidebar badge.
export function useNewRequestCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const { count: n } = await createClient()
        .from("contact_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "new");
      if (active) setCount(n ?? 0);
    };
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    window.addEventListener(CHANGED_EVENT, refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener(CHANGED_EVENT, refresh);
    };
  }, []);
  return count;
}

async function loadRequests() {
  const [requests, people] = await Promise.all([
    createClient()
      .from("contact_requests")
      .select("id, name, company, email, phone, message, status, handled_by, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
    loadPeople(),
  ]);
  return { requests: must<ContactRequest[]>(requests), people };
}

// Messages from the contact form on the homepage.
export function RequestsSection({ locale, t }: { locale: Locale; t: Dictionary }) {
  const r = t.requests;
  const { data, error, reload } = useLoad(loadRequests);
  const [filter, setFilter] = useState<RequestStatus | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const me = useUser();
  const date = new Intl.DateTimeFormat(dateLocale(locale), { dateStyle: "medium", timeStyle: "short" });

  const all = data?.requests ?? [];
  const shown = all.filter((x) => filter === "all" || x.status === filter);
  const people = new Map<string, Person>(data?.people.map((p) => [p.id, p]));
  const opened = all.find((x) => x.id === openId);

  const changed = () => {
    reload();
    window.dispatchEvent(new Event(CHANGED_EVENT));
  };

  async function setStatus(req: ContactRequest, status: RequestStatus) {
    const { error: e } = await createClient()
      .from("contact_requests")
      .update({ status, handled_by: status === "new" ? null : (req.handled_by ?? me.id) })
      .eq("id", req.id);
    if (e) return setActionError(e.message);
    setActionError(null);
    changed();
  }

  async function remove(req: ContactRequest) {
    if (!window.confirm(r.confirmDelete)) return;
    const { error: e } = await createClient().from("contact_requests").delete().eq("id", req.id);
    if (e) return setActionError(e.message);
    setOpenId(null);
    changed();
  }

  const filters: [RequestStatus | "all", string][] = [
    ...STATUSES.map((s): [RequestStatus, string] => [s, `${r.status[s]} (${all.filter((x) => x.status === s).length})`]),
    ["all", r.filterAll],
  ];

  const statusMenu = (req: ContactRequest) => (
    <StatusMenu
      value={req.status}
      options={STATUSES}
      label={(s) => r.status[s]}
      tone={(s) => TONES[s]}
      onChange={(s) => setStatus(req, s)}
    />
  );

  return (
    <div>
      <SectionHeader title={t.admin.sections.requests} />
      <p className="-mt-4 mb-5 text-sm text-silver-dim">{r.hint}</p>
      <ErrorNote error={error ?? actionError} />

      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-full border px-4 py-1.5 text-sm transition ${
              filter === key ? "border-gold bg-gold/15 text-gold" : "border-line text-silver-dim hover:border-gold/60"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <Panel>
        {!data ? null : !shown.length ? (
          <p className="text-center text-sm text-silver-dim">{r.none}</p>
        ) : (
          <ul className="-my-2 divide-y divide-line">
            {shown.map((x) => (
              <li key={x.id} className="flex items-start gap-3 py-3">
                <button
                  type="button"
                  onClick={() => setOpenId(x.id)}
                  className="min-w-0 flex-1 text-left transition hover:opacity-80"
                >
                  <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                    {x.status === "new" && <span className="h-2.5 w-2.5 rounded-full bg-gold" />}
                    <span className="text-sm font-medium text-white">{x.name}</span>
                    {x.company && <span className="text-xs text-silver-dim">· {x.company}</span>}
                    <span className="text-xs text-silver-dim">· {x.email}</span>
                    <span className="ml-auto text-xs text-silver-dim">{date.format(new Date(x.created_at))}</span>
                  </div>
                  <p className="line-clamp-2 text-sm text-silver">{x.message}</p>
                </button>
                <div className="shrink-0 pt-0.5">{statusMenu(x)}</div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {opened && (
        <Modal title={opened.name} onClose={() => setOpenId(null)} wide>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {statusMenu(opened)}
            <span className="text-xs text-silver-dim">
              {r.received}: {date.format(new Date(opened.created_at))}
            </span>
            {opened.handled_by && (
              <span className="text-xs text-silver-dim">
                · {r.handledBy}: {personName(people.get(opened.handled_by))}
              </span>
            )}
          </div>
          <dl className="mb-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {opened.company && <Info label={t.contactForm.company} value={opened.company} />}
            <Info label={t.contactForm.email} value={opened.email} />
            {opened.phone && <Info label={t.contactForm.phone} value={opened.phone} />}
          </dl>
          <p className="whitespace-pre-wrap rounded-xl border border-line bg-panel-2 p-4 text-sm text-silver">
            {opened.message}
          </p>
          <ModalActions>
            {me.roles.includes("admin") && (
              <IconButton danger onClick={() => remove(opened)} aria-label={r.delete} title={r.delete} className="mr-auto">
                <Trash2 size={14} />
              </IconButton>
            )}
            {opened.phone && (
              <ButtonLink href={`tel:${opened.phone.replace(/[^\d+]/g, "")}`} variant="ghost">
                <Phone size={14} /> {r.call}
              </ButtonLink>
            )}
            <ButtonLink
              href={`mailto:${opened.email}?subject=${encodeURIComponent(r.replySubject)}`}
              onClick={() => opened.status === "new" && setStatus(opened, "in_progress")}
            >
              <Mail size={14} /> {r.reply}
            </ButtonLink>
          </ModalActions>
        </Modal>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-silver-dim">{label}</dt>
      <dd className="break-all text-white">{value}</dd>
    </div>
  );
}
