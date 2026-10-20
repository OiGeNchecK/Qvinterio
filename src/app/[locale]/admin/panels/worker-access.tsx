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
  Table,
  must,
  toDateInput,
  useLoad,
} from "../kit";
import { loadPeople, loadProjectRefs, personName, type ProjectRef } from "../data";
import { CopyRow, DAY, endOfDay } from "./access";
import { callAdminUsers } from "./users";

// Every key worker has a worker_access row; expires_at null means no end date.
type Access = { user_id: string; expires_at: string | null; revoked_at: string | null };

type Worker = Access & { name: string; key: string; projectIds: string[] };

function loginUrl(locale: Locale) {
  return `${window.location.origin}${basePath}/${locale}/login/`;
}

async function loadAll() {
  const supabase = createClient();
  const [access, keys, members, people, projects] = await Promise.all([
    supabase.from("worker_access").select("user_id, expires_at, revoked_at").order("created_at", { ascending: false }),
    supabase.from("client_keys").select("client_id, key"),
    supabase.from("project_members").select("user_id, project_id"),
    loadPeople(),
    loadProjectRefs(),
  ]);
  const keyById = new Map(must<{ client_id: string; key: string }[]>(keys).map((k) => [k.client_id, k.key]));
  const memberRows = must<{ user_id: string; project_id: string }[]>(members);
  const names = new Map(people.map((p) => [p.id, personName(p)]));
  const workers: Worker[] = must<Access[]>(access).map((w) => ({
    ...w,
    name: names.get(w.user_id) ?? "—",
    key: keyById.get(w.user_id) ?? "",
    projectIds: memberRows.filter((m) => m.user_id === w.user_id).map((m) => m.project_id),
  }));
  return { workers, projects };
}

function isActive(w: Access) {
  return !w.revoked_at && (!w.expires_at || new Date(w.expires_at) > new Date());
}

export function WorkerAccessSection({ locale, t }: { locale: Locale; t: Dictionary }) {
  const a = t.adminUi;
  const { data, error, reload } = useLoad(loadAll);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const dateFormat = new Intl.DateTimeFormat(dateLocale(locale), { dateStyle: "medium" });
  const projects = new Map(data?.projects.map((p) => [p.id, p.name]));
  const opened = data?.workers.find((w) => w.user_id === openId);

  async function act(fn: () => Promise<unknown>) {
    try {
      await fn();
      setActionError(null);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    }
    reload();
  }

  const setAccess = (w: Worker, patch: Partial<Access>) =>
    act(async () => must(await createClient().from("worker_access").update(patch).eq("user_id", w.user_id)));

  // Lift a revoke; an expired access gets 30 more days from today.
  const reactivate = (w: Worker, now: number) =>
    setAccess(w, {
      revoked_at: null,
      expires_at:
        w.expires_at && new Date(w.expires_at).getTime() < now ? new Date(now + 30 * DAY).toISOString() : w.expires_at,
    });

  const newKey = (w: Worker) =>
    window.confirm(a.newKeyConfirm.replace("{name}", w.name)) &&
    act(async () => {
      await callAdminUsers({ action: "key_new", client_id: w.user_id });
      setOpenId(w.user_id);
    });

  const remove = (w: Worker) =>
    window.confirm(a.deleteAccessConfirm.replace("{name}", w.name)) &&
    act(() => callAdminUsers({ action: "key_delete", client_id: w.user_id }));

  return (
    <div>
      <SectionHeader title={t.admin.sections.workers}>
        <Button onClick={() => setCreating(true)}>
          <Plus size={16} /> {a.grantAccess}
        </Button>
      </SectionHeader>
      <p className="-mt-3 mb-5 text-sm text-silver-dim">{a.workerAccessHint}</p>
      <ErrorNote error={error ?? actionError} />

      <Panel>
        <Table head={[t.roles.worker, a.sites, a.accessKey, t.client.validUntil, a.status, ""]}>
          {data?.workers.map((w) => {
            const active = isActive(w);
            return (
              <tr key={w.user_id}>
                <td className="font-medium text-white">{w.name}</td>
                <td className="text-silver">
                  {w.projectIds.map((id) => projects.get(id)).join(", ") || <span className="text-silver-dim">—</span>}
                </td>
                <td className="whitespace-nowrap font-mono tracking-wider text-gold">{w.key || "—"}</td>
                <td className="whitespace-nowrap text-silver-dim">
                  {w.expires_at ? dateFormat.format(new Date(w.expires_at)) : a.noEndDate}
                </td>
                <td>
                  <Badge tone={w.revoked_at ? "red" : active ? "green" : "gray"}>
                    {w.revoked_at ? a.revoked : active ? a.active : a.expired}
                  </Badge>
                </td>
                <td>
                  <div className="flex justify-end gap-1.5">
                    <IconButton onClick={() => setOpenId(w.user_id)} title={a.edit}>
                      <Pencil size={14} />
                    </IconButton>
                    <IconButton onClick={() => newKey(w)} title={a.newKey}>
                      <KeyRound size={14} />
                    </IconButton>
                    {active ? (
                      <IconButton
                        danger
                        onClick={() => setAccess(w, { revoked_at: new Date().toISOString() })}
                        title={a.revoke}
                      >
                        <Ban size={14} />
                      </IconButton>
                    ) : (
                      <IconButton onClick={() => reactivate(w, Date.now())} title={a.reactivate}>
                        <RotateCcw size={14} />
                      </IconButton>
                    )}
                    <IconButton danger onClick={() => remove(w)} title={a.delete}>
                      <Trash2 size={14} />
                    </IconButton>
                  </div>
                </td>
              </tr>
            );
          })}
          {data && !data.workers.length && <EmptyRow cols={6}>{a.noWorkerAccess}</EmptyRow>}
        </Table>
      </Panel>

      {creating && data && (
        <NewWorkerModal
          t={t}
          projects={data.projects}
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            setOpenId(id);
            reload();
          }}
        />
      )}
      {opened && data && (
        <WorkerModal
          key={`${opened.user_id}-${opened.key}`}
          t={t}
          locale={locale}
          worker={opened}
          projects={data.projects}
          formatDate={(iso) => dateFormat.format(new Date(iso))}
          onSaved={reload}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}

function SitePicker({
  projects,
  value,
  onChange,
}: {
  projects: ProjectRef[];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  return (
    <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
      {projects.map((p) => {
        const on = value.includes(p.id);
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(on ? value.filter((id) => id !== p.id) : [...value, p.id])}
            className={`rounded-md border px-2.5 py-1 text-xs transition ${
              on ? "border-gold bg-gold/15 text-gold" : "border-line text-silver-dim hover:border-gold/60"
            }`}
          >
            {p.name}
          </button>
        );
      })}
    </div>
  );
}

function NewWorkerModal({
  t,
  projects,
  onClose,
  onCreated,
}: {
  t: Dictionary;
  projects: ProjectRef[];
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const a = t.adminUi;
  const [name, setName] = useState("");
  const [sites, setSites] = useState<string[]>([]);
  const [until, setUntil] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!name.trim()) return setError(a.nameRequired);
    setBusy(true);
    setError(null);
    try {
      const res = await callAdminUsers({
        action: "worker_key",
        full_name: name,
        project_ids: sites,
        expires_at: until ? endOfDay(until) : null,
      });
      onCreated(res.id ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <Modal title={a.grantAccess} onClose={onClose}>
      <div className="space-y-4">
        <Field label={a.fullName}>
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div>
          <div className="mb-2 text-xs text-silver-dim">{a.sites}</div>
          <SitePicker projects={projects} value={sites} onChange={setSites} />
        </div>
        <Field label={`${t.client.validUntil} (${a.optional})`}>
          <Input type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
        </Field>
        <p className="text-xs text-silver-dim">{a.workerKeyHint}</p>
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

// Key and login link to pass on, plus the sites and the end date.
function WorkerModal({
  t,
  locale,
  worker: w,
  projects,
  formatDate,
  onSaved,
  onClose,
}: {
  t: Dictionary;
  locale: Locale;
  worker: Worker;
  projects: ProjectRef[];
  formatDate: (iso: string) => string;
  onSaved: () => void;
  onClose: () => void;
}) {
  const a = t.adminUi;
  const [copied, setCopied] = useState<string | null>(null);
  const [sites, setSites] = useState(w.projectIds);
  const [until, setUntil] = useState(toDateInput(w.expires_at));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const url = loginUrl(locale);
  const message = a.workerMessage
    .replace("{url}", url)
    .replace("{key}", w.key)
    .replace("{until}", w.expires_at ? formatDate(w.expires_at) : a.noEndDate);

  async function copy(key: string, text: string) {
    await navigator.clipboard.writeText(text).catch(() => undefined);
    setCopied(key);
  }

  // A new end date also lifts a revoke.
  async function save() {
    setBusy(true);
    const supabase = createClient();
    const added = sites.filter((id) => !w.projectIds.includes(id));
    const removed = w.projectIds.filter((id) => !sites.includes(id));
    try {
      must(
        await supabase
          .from("worker_access")
          .update({ expires_at: until ? endOfDay(until) : null, revoked_at: null })
          .eq("user_id", w.user_id),
      );
      if (added.length)
        must(
          await supabase
            .from("project_members")
            .insert(added.map((project_id) => ({ project_id, user_id: w.user_id }))),
        );
      if (removed.length)
        must(await supabase.from("project_members").delete().eq("user_id", w.user_id).in("project_id", removed));
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <Modal title={`${a.accessFor} ${w.name}`} onClose={onClose}>
      <p className="mb-4 text-sm text-silver-dim">{a.workerCredentialsHint}</p>
      <div className="space-y-2">
        <CopyRow label={a.loginPage} value={url} copied={copied === "url"} onCopy={() => copy("url", url)} t={t} />
        <CopyRow
          label={a.accessKey}
          value={w.key}
          big
          copied={copied === "key"}
          onCopy={() => copy("key", w.key)}
          t={t}
        />
      </div>
      <div className="mt-5 space-y-4">
        <div>
          <div className="mb-2 text-xs text-silver-dim">{a.sites}</div>
          <SitePicker projects={projects} value={sites} onChange={setSites} />
        </div>
        <Field label={`${t.client.validUntil} (${a.optional})`}>
          <Input type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
        </Field>
      </div>
      <ErrorNote error={error} />
      <ModalActions>
        <Button variant="ghost" onClick={() => copy("all", message)} disabled={!w.key}>
          {copied === "all" ? <Check size={16} /> : <Copy size={16} />} {a.copyMessage}
        </Button>
        <Button onClick={save} disabled={busy}>
          {a.save}
        </Button>
      </ModalActions>
    </Modal>
  );
}
