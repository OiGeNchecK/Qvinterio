"use client";

import { useState } from "react";
import { Ban, CalendarPlus, Plus } from "lucide-react";
import { Button } from "@/components/button";
import { createClient } from "@/lib/supabase/client";
import { dateLocale, type Dictionary, type Locale } from "@/i18n";
import {
  Badge,
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
  Table,
  must,
  useLoad,
} from "../kit";
import { loadPeople, loadProjectRefs, personName, type Person, type ProjectRef } from "../data";

type Grant = {
  id: string;
  project_id: string;
  client_id: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
};

const DAY = 24 * 60 * 60 * 1000;

function inDays(days: number) {
  return new Date(Date.now() + days * DAY).toISOString().slice(0, 10);
}

// End of the chosen day, so access lasts through it.
function endOfDay(date: string) {
  return new Date(`${date}T23:59:59`).toISOString();
}

async function loadAll() {
  const [grants, people, projects] = await Promise.all([
    createClient()
      .from("client_access")
      .select("id, project_id, client_id, expires_at, revoked_at, created_at")
      .order("created_at", { ascending: false }),
    loadPeople(),
    loadProjectRefs(),
  ]);
  return { grants: must<Grant[]>(grants), people, projects };
}

export function AccessSection({ locale, t }: { locale: Locale; t: Dictionary }) {
  const a = t.adminUi;
  const { data, error, reload } = useLoad(loadAll);
  const [granting, setGranting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const dateFormat = new Intl.DateTimeFormat(dateLocale(locale), { dateStyle: "medium" });

  const people = new Map(data?.people.map((p) => [p.id, p]));
  const projects = new Map(data?.projects.map((p) => [p.id, p.name]));

  async function run(action: PromiseLike<{ error: { message: string } | null }>) {
    const { error } = await action;
    setActionError(error?.message ?? null);
    reload();
  }

  // Called from a click handler, so reading the clock here is fine.
  const extend = (g: Grant, now: number) =>
    run(
      createClient()
        .from("client_access")
        .update({
          revoked_at: null,
          expires_at: new Date(Math.max(now, +new Date(g.expires_at)) + 30 * DAY).toISOString(),
        })
        .eq("id", g.id),
    );

  const revoke = (g: Grant) =>
    run(createClient().from("client_access").update({ revoked_at: new Date().toISOString() }).eq("id", g.id));

  return (
    <div>
      <SectionHeader title={t.admin.sections.access}>
        <Button onClick={() => setGranting(true)}>
          <Plus size={16} /> {a.grantAccess}
        </Button>
      </SectionHeader>
      <ErrorNote error={error ?? actionError} />

      <Panel>
        <Table head={[t.roles.client, a.site, t.client.validUntil, a.status, ""]}>
          {data?.grants.map((g) => {
            const active = !g.revoked_at && new Date(g.expires_at) > new Date();
            return (
              <tr key={g.id}>
                <td className="font-medium text-white">{personName(people.get(g.client_id))}</td>
                <td className="text-silver">{projects.get(g.project_id)}</td>
                <td className="whitespace-nowrap text-silver-dim">{dateFormat.format(new Date(g.expires_at))}</td>
                <td>
                  <Badge tone={g.revoked_at ? "red" : active ? "green" : "gray"}>
                    {g.revoked_at ? a.revoked : active ? a.active : a.expired}
                  </Badge>
                </td>
                <td>
                  <div className="flex justify-end gap-1.5">
                    <IconButton onClick={() => extend(g, Date.now())} title={a.extend30}>
                      <CalendarPlus size={14} />
                    </IconButton>
                    {active && (
                      <IconButton danger onClick={() => revoke(g)} title={a.revoke}>
                        <Ban size={14} />
                      </IconButton>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
          {data && !data.grants.length && <EmptyRow cols={5}>{a.noGrants}</EmptyRow>}
        </Table>
      </Panel>

      {granting && data && (
        <GrantModal
          t={t}
          clients={data.people.filter((p) => p.active && p.roles.includes("client"))}
          projects={data.projects}
          onClose={() => setGranting(false)}
          onSaved={reload}
        />
      )}
    </div>
  );
}

function GrantModal({
  t,
  clients,
  projects,
  onClose,
  onSaved,
}: {
  t: Dictionary;
  clients: Person[];
  projects: ProjectRef[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const a = t.adminUi;
  const [form, setForm] = useState({ client_id: "", project_id: "", until: inDays(30) });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!form.client_id || !form.project_id || !form.until) return setError(a.fillAll);
    setBusy(true);
    const { error } = await createClient().from("client_access").insert({
      client_id: form.client_id,
      project_id: form.project_id,
      expires_at: endOfDay(form.until),
    });
    setBusy(false);
    if (error) return setError(error.message);
    onSaved();
    onClose();
  }

  return (
    <Modal title={a.grantAccess} onClose={onClose}>
      <div className="space-y-4">
        <Field label={t.roles.client}>
          <Select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
            <option value="">—</option>
            {clients.map((p) => (
              <option key={p.id} value={p.id}>
                {personName(p)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={a.site}>
          <Select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
            <option value="">—</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t.client.validUntil}>
          <Input type="date" value={form.until} onChange={(e) => setForm({ ...form, until: e.target.value })} />
        </Field>
        <p className="text-xs text-silver-dim">{a.clientHint}</p>
      </div>
      <ErrorNote error={error} />
      <ModalActions>
        <Button variant="ghost" onClick={onClose}>
          {a.cancel}
        </Button>
        <Button onClick={save} disabled={busy}>
          {a.grant}
        </Button>
      </ModalActions>
    </Modal>
  );
}
