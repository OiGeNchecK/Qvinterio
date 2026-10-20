"use client";

import { useState } from "react";
import { Ban, CalendarPlus, Check, Copy, KeyRound, Plus } from "lucide-react";
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
  useLoad,
} from "../kit";
import { loadPeople, loadProjectRefs, personName, type Person, type ProjectRef } from "../data";
import { callAdminUsers } from "./users";

type Grant = {
  id: string;
  project_id: string;
  client_id: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
};

type Credentials = { name: string; email: string; password: string; site: string; until: string };

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

  async function newPassword(g: Grant) {
    const client = people.get(g.client_id);
    if (!window.confirm(a.newPasswordConfirm.replace("{name}", personName(client)))) return;
    try {
      const res = await callAdminUsers({ action: "client_password", client_id: g.client_id });
      setActionError(null);
      setCredentials({
        name: personName(client),
        email: res.email ?? client?.email ?? "",
        password: res.password ?? "",
        site: projects.get(g.project_id) ?? "",
        until: dateFormat.format(new Date(g.expires_at)),
      });
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
        <Table head={[t.roles.client, a.email, a.site, t.client.validUntil, a.status, ""]}>
          {data?.grants.map((g) => {
            const active = !g.revoked_at && new Date(g.expires_at) > new Date();
            const client = people.get(g.client_id);
            return (
              <tr key={g.id}>
                <td className="font-medium text-white">{client?.full_name || "—"}</td>
                <td className="text-silver-dim">{client?.email}</td>
                <td className="text-silver">{projects.get(g.project_id)}</td>
                <td className="whitespace-nowrap text-silver-dim">{dateFormat.format(new Date(g.expires_at))}</td>
                <td>
                  <Badge tone={g.revoked_at ? "red" : active ? "green" : "gray"}>
                    {g.revoked_at ? a.revoked : active ? a.active : a.expired}
                  </Badge>
                </td>
                <td>
                  <div className="flex justify-end gap-1.5">
                    <IconButton onClick={() => newPassword(g)} title={a.newPassword}>
                      <KeyRound size={14} />
                    </IconButton>
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
          {data && !data.grants.length && <EmptyRow cols={6}>{a.noGrants}</EmptyRow>}
        </Table>
      </Panel>

      {granting && data && (
        <GrantModal
          t={t}
          clients={data.people.filter((p) => p.active && p.roles.includes("client"))}
          projects={data.projects}
          onClose={() => setGranting(false)}
          onGranted={(c) => {
            reload();
            setGranting(false);
            if (c) setCredentials({ ...c, until: dateFormat.format(new Date(c.until)) });
          }}
        />
      )}
      {credentials && <CredentialsModal t={t} credentials={credentials} onClose={() => setCredentials(null)} />}
    </div>
  );
}

function GrantModal({
  t,
  clients,
  projects,
  onClose,
  onGranted,
}: {
  t: Dictionary;
  clients: Person[];
  projects: ProjectRef[];
  onClose: () => void;
  onGranted: (credentials: Credentials | null) => void;
}) {
  const a = t.adminUi;
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [form, setForm] = useState({ full_name: "", email: "", client_id: "", project_id: "", until: inDays(30) });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const client = mode === "existing" ? clients.find((c) => c.id === form.client_id) : null;
    if (!form.project_id || !form.until || (mode === "new" ? !form.email.trim() : !client)) return setError(a.fillAll);
    setBusy(true);
    setError(null);
    try {
      const res = await callAdminUsers({
        action: "client_access",
        project_id: form.project_id,
        expires_at: endOfDay(form.until),
        ...(client ? { client_id: client.id } : { full_name: form.full_name, email: form.email }),
      });
      onGranted(
        res.password
          ? {
              name: form.full_name || form.email,
              email: res.email ?? form.email,
              password: res.password,
              site: projects.find((p) => p.id === form.project_id)?.name ?? "",
              until: endOfDay(form.until),
            }
          : null,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  const tab = (value: typeof mode, label: string) => (
    <button
      type="button"
      onClick={() => setMode(value)}
      className={`flex-1 rounded-md px-3 py-2 text-sm transition ${
        mode === value ? "bg-gold/15 text-gold" : "text-silver-dim hover:text-silver"
      }`}
    >
      {label}
    </button>
  );

  return (
    <Modal title={a.grantAccess} onClose={onClose}>
      <div className="mb-5 flex gap-1 rounded-lg border border-line p-1">
        {tab("new", a.newClient)}
        {tab("existing", a.existingClient)}
      </div>
      <div className="space-y-4">
        {mode === "new" ? (
          <>
            <Field label={a.fullName}>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </Field>
            <Field label={a.email}>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
          </>
        ) : (
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
        )}
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
        <p className="text-xs text-silver-dim">{mode === "new" ? a.newClientHint : a.existingClientHint}</p>
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

// Shown once after a password was generated; it is not stored anywhere.
function CredentialsModal({ t, credentials: c, onClose }: { t: Dictionary; credentials: Credentials; onClose: () => void }) {
  const a = t.adminUi;
  const [copied, setCopied] = useState<string | null>(null);
  const url = clientLoginUrl();
  const message = a.credentialsMessage
    .replace("{site}", c.site)
    .replace("{url}", url)
    .replace("{email}", c.email)
    .replace("{password}", c.password)
    .replace("{until}", c.until);

  async function copy(key: string, text: string) {
    await navigator.clipboard.writeText(text).catch(() => undefined);
    setCopied(key);
  }

  const row = (key: string, label: string, value: string, big?: boolean) => (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-panel-2 px-4 py-3">
      <div className="min-w-0">
        <div className="text-xs text-silver-dim">{label}</div>
        <div className={`truncate ${big ? "font-mono text-xl tracking-wider text-gold" : "text-silver"}`}>{value}</div>
      </div>
      <IconButton onClick={() => copy(key, value)} title={a.copy}>
        {copied === key ? <Check size={14} /> : <Copy size={14} />}
      </IconButton>
    </div>
  );

  return (
    <Modal title={`${a.accessFor} ${c.name}`} onClose={onClose}>
      <p className="mb-4 text-sm text-silver-dim">{a.credentialsHint.replace("{site}", c.site)}</p>
      <div className="space-y-2">
        {row("url", a.loginPage, url)}
        {row("email", a.email, c.email)}
        {row("password", a.password, c.password, true)}
      </div>
      <ModalActions>
        <Button variant="ghost" onClick={() => copy("all", message)}>
          {copied === "all" ? <Check size={16} /> : <Copy size={16} />} {a.copyMessage}
        </Button>
        <Button onClick={onClose}>{a.done}</Button>
      </ModalActions>
    </Modal>
  );
}
