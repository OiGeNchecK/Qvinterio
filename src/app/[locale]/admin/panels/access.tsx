"use client";

import { useState } from "react";
import { Ban, Check, Copy, KeyRound, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/button";
import { createClient } from "@/lib/supabase/client";
import { basePath } from "@/lib/paths";
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
  toDateInput,
  useLoad,
} from "../kit";
import { loadPeople, loadProjectRefs, personName, type ProjectRef } from "../data";
import { callAdminUsers } from "./users";

type Grant = {
  id: string;
  project_id: string;
  client_id: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
};

// until is the ISO end of access; grantId lets the dialog change it.
type Credentials = { name: string; key: string; site: string; until: string; grantId: string };

const DAY = 24 * 60 * 60 * 1000;

function inDays(days: number) {
  return new Date(Date.now() + days * DAY).toISOString().slice(0, 10);
}

// End of the chosen day, so access lasts through it.
function endOfDay(date: string) {
  return new Date(`${date}T23:59:59`).toISOString();
}

// The client login is always offered in German.
function clientLoginUrl() {
  return `${window.location.origin}${basePath}/de/login/?for=client`;
}

async function loadAll() {
  const supabase = createClient();
  const [grants, keys, people, projects] = await Promise.all([
    supabase
      .from("client_access")
      .select("id, project_id, client_id, expires_at, revoked_at, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("client_keys").select("client_id, key"),
    loadPeople(),
    loadProjectRefs(),
  ]);
  const keyRows = must<{ client_id: string; key: string }[]>(keys);
  return { grants: must<Grant[]>(grants), keys: new Map(keyRows.map((k) => [k.client_id, k.key])), people, projects };
}

export function AccessSection({ locale, t }: { locale: Locale; t: Dictionary }) {
  const a = t.adminUi;
  const { data, error, reload } = useLoad(loadAll);
  const [granting, setGranting] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const dateFormat = new Intl.DateTimeFormat(dateLocale(locale), { dateStyle: "medium" });

  const people = new Map(data?.people.map((p) => [p.id, p]));
  const projects = new Map(data?.projects.map((p) => [p.id, p.name]));

  async function run(action: PromiseLike<{ error: { message: string } | null }>) {
    const { error } = await action;
    setActionError(error?.message ?? null);
    reload();
  }

  // Lift a revoke; an expired access gets 30 more days from today.
  const reactivate = (g: Grant, now: number) =>
    run(
      createClient()
        .from("client_access")
        .update({
          revoked_at: null,
          expires_at: new Date(Math.max(now + 30 * DAY, +new Date(g.expires_at))).toISOString(),
        })
        .eq("id", g.id),
    );

  async function remove(g: Grant) {
    if (!window.confirm(a.deleteAccessConfirm.replace("{name}", personName(people.get(g.client_id))))) return;
    try {
      await callAdminUsers({ action: "client_delete", client_id: g.client_id });
      setActionError(null);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    }
    reload();
  }

  const revoke = (g: Grant) =>
    run(createClient().from("client_access").update({ revoked_at: new Date().toISOString() }).eq("id", g.id));

  const credentialsFor = (g: Grant): Credentials => ({
    name: personName(people.get(g.client_id)),
    key: data?.keys.get(g.client_id) ?? "",
    site: projects.get(g.project_id) ?? "",
    until: g.expires_at,
    grantId: g.id,
  });

  async function newKey(g: Grant) {
    const client = people.get(g.client_id);
    if (!window.confirm(a.newKeyConfirm.replace("{name}", personName(client)))) return;
    try {
      const res = await callAdminUsers({ action: "client_new_key", client_id: g.client_id });
      setActionError(null);
      reload();
      setCredentials({ ...credentialsFor(g), key: res.key ?? "" });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div>
      <SectionHeader title={t.admin.sections.access}>
        <Button onClick={() => setGranting(true)}>
          <Plus size={16} /> {a.grantAccess}
        </Button>
      </SectionHeader>
      <p className="-mt-3 mb-5 text-sm text-silver-dim">{a.accessHint}</p>
      <ErrorNote error={error ?? actionError} />

      <Panel>
        <Table head={[t.roles.client, a.site, a.accessKey, t.client.validUntil, a.status, ""]}>
          {data?.grants.map((g) => {
            const active = !g.revoked_at && new Date(g.expires_at) > new Date();
            const client = people.get(g.client_id);
            return (
              <tr key={g.id}>
                <td className="font-medium text-white">{client?.full_name || "—"}</td>
                <td className="text-silver">{projects.get(g.project_id)}</td>
                <td className="whitespace-nowrap font-mono tracking-wider text-gold">
                  {data.keys.get(g.client_id) ?? "—"}
                </td>
                <td className="whitespace-nowrap text-silver-dim">{dateFormat.format(new Date(g.expires_at))}</td>
                <td>
                  <Badge tone={g.revoked_at ? "red" : active ? "green" : "gray"}>
                    {g.revoked_at ? a.revoked : active ? a.active : a.expired}
                  </Badge>
                </td>
                <td>
                  <div className="flex justify-end gap-1.5">
                    <IconButton onClick={() => setCredentials(credentialsFor(g))} title={a.edit}>
                      <Pencil size={14} />
                    </IconButton>
                    <IconButton onClick={() => newKey(g)} title={a.newKey}>
                      <KeyRound size={14} />
                    </IconButton>
                    {active ? (
                      <IconButton danger onClick={() => revoke(g)} title={a.revoke}>
                        <Ban size={14} />
                      </IconButton>
                    ) : (
                      <IconButton onClick={() => reactivate(g, Date.now())} title={a.reactivate}>
                        <RotateCcw size={14} />
                      </IconButton>
                    )}
                    <IconButton danger onClick={() => remove(g)} title={a.delete}>
                      <Trash2 size={14} />
                    </IconButton>
                  </div>
                </td>
              </tr>
            );
          })}
          {data && !data.grants.length && <EmptyRow cols={6}>{a.noGrants}</EmptyRow>}
        </Table>
      </Panel>

      {granting && data && (
        <GrantModal
          t={t}
          projects={data.projects}
          onClose={() => setGranting(false)}
          onGranted={(c) => {
            reload();
            setGranting(false);
            setCredentials(c);
          }}
        />
      )}
      {credentials && (
        <CredentialsModal
          t={t}
          credentials={credentials}
          formatDate={(iso) => dateFormat.format(new Date(iso))}
          onDateSaved={(until) => {
            setCredentials({ ...credentials, until });
            reload();
          }}
          onClose={() => setCredentials(null)}
        />
      )}
    </div>
  );
}

function GrantModal({
  t,
  projects,
  onClose,
  onGranted,
}: {
  t: Dictionary;
  projects: ProjectRef[];
  onClose: () => void;
  onGranted: (credentials: Credentials) => void;
}) {
  const a = t.adminUi;
  const [form, setForm] = useState({ full_name: "", project_id: "", until: inDays(30) });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!form.full_name.trim() || !form.project_id || !form.until) return setError(a.fillAll);
    setBusy(true);
    setError(null);
    try {
      const res = await callAdminUsers({
        action: "client_key",
        full_name: form.full_name,
        project_id: form.project_id,
        expires_at: endOfDay(form.until),
      });
      onGranted({
        name: form.full_name.trim(),
        key: res.key ?? "",
        site: projects.find((p) => p.id === form.project_id)?.name ?? "",
        until: endOfDay(form.until),
        grantId: res.grant_id ?? "",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <Modal title={a.grantAccess} onClose={onClose}>
      <div className="space-y-4">
        <Field label={a.clientName}>
          <Input
            autoFocus
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            placeholder={a.clientNameHint}
          />
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
        <p className="text-xs text-silver-dim">{a.newClientHint}</p>
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

// The key, the login link and the end of access; the date can be changed here.
function CredentialsModal({
  t,
  credentials: c,
  formatDate,
  onDateSaved,
  onClose,
}: {
  t: Dictionary;
  credentials: Credentials;
  formatDate: (iso: string) => string;
  onDateSaved: (until: string) => void;
  onClose: () => void;
}) {
  const a = t.adminUi;
  const [copied, setCopied] = useState<string | null>(null);
  const [date, setDate] = useState(toDateInput(c.until));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const url = clientLoginUrl();
  const message = a.credentialsMessage
    .replace("{site}", c.site)
    .replace("{url}", url)
    .replace("{key}", c.key)
    .replace("{until}", formatDate(c.until));

  async function copy(key: string, text: string) {
    await navigator.clipboard.writeText(text).catch(() => undefined);
    setCopied(key);
  }

  // A new end date also lifts a revoke.
  async function saveDate() {
    if (!date || !c.grantId) return;
    setBusy(true);
    const until = endOfDay(date);
    const { error } = await createClient()
      .from("client_access")
      .update({ expires_at: until, revoked_at: null })
      .eq("id", c.grantId);
    setBusy(false);
    setError(error?.message ?? null);
    if (!error) onDateSaved(until);
  }

  const row = (key: string, label: string, value: string, big?: boolean) => (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-panel-2 px-4 py-3">
      <div className="min-w-0">
        <div className="text-xs text-silver-dim">{label}</div>
        <div className={`truncate ${big ? "font-mono text-xl tracking-wider text-gold" : "text-silver"}`}>
          {value || "—"}
        </div>
      </div>
      {value && (
        <IconButton onClick={() => copy(key, value)} title={a.copy}>
          {copied === key ? <Check size={14} /> : <Copy size={14} />}
        </IconButton>
      )}
    </div>
  );

  return (
    <Modal title={`${a.accessFor} ${c.name}`} onClose={onClose}>
      <p className="mb-4 text-sm text-silver-dim">{a.credentialsHint.replace("{site}", c.site)}</p>
      <div className="space-y-2">
        {row("url", a.loginPage, url)}
        {row("key", a.accessKey, c.key, true)}
      </div>
      {c.grantId && (
        <div className="mt-5 flex items-end gap-2">
          <Field label={t.client.validUntil} className="flex-1">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Button variant="ghost" onClick={saveDate} disabled={busy || date === toDateInput(c.until)}>
            {a.save}
          </Button>
        </div>
      )}
      <ErrorNote error={error} />
      <ModalActions>
        <Button variant="ghost" onClick={() => copy("all", message)} disabled={!c.key}>
          {copied === "all" ? <Check size={16} /> : <Copy size={16} />} {a.copyMessage}
        </Button>
        <Button onClick={onClose}>{a.done}</Button>
      </ModalActions>
    </Modal>
  );
}
