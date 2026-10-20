"use client";

import { useState } from "react";
import { KeyRound, Plus, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/button";
import { createClient } from "@/lib/supabase/client";
import { useUser, type AppRole } from "@/lib/auth";
import type { Dictionary } from "@/i18n";
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
  useLoad,
} from "../kit";
import { ROLES, loadPeople, personName, type Person } from "../data";

// Creating accounts and setting passwords needs the service key,
// so it runs in the "admin-users" edge function.
export async function callAdminUsers(body: Record<string, unknown>) {
  const { data, error } = await createClient().functions.invoke("admin-users", { body });
  if (error) {
    const context = (error as { context?: Response }).context;
    const detail = context ? await context.json().catch(() => null) : null;
    throw new Error(detail?.error ?? error.message);
  }
  return data as { id?: string; key?: string; grant_id?: string };
}

function RoleChips({ value, onToggle, t, disabled }: { value: AppRole[]; onToggle: (r: AppRole) => void; t: Dictionary; disabled?: (r: AppRole) => boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ROLES.map((role) => {
        const on = value.includes(role);
        return (
          <button
            key={role}
            type="button"
            onClick={() => onToggle(role)}
            disabled={disabled?.(role)}
            className={`rounded-md border px-2.5 py-1 text-xs transition disabled:cursor-not-allowed ${
              on ? "border-gold bg-gold/15 text-gold" : "border-line text-silver-dim hover:border-gold/60"
            }`}
          >
            {t.roles[role]}
          </button>
        );
      })}
    </div>
  );
}

export function UsersSection({ t }: { t: Dictionary }) {
  const a = t.adminUi;
  const me = useUser();
  const isAdmin = me.roles.includes("admin");
  const { data, error, reload } = useLoad(loadPeople);
  const [creating, setCreating] = useState(false);
  const [passwordFor, setPasswordFor] = useState<Person | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function toggleRole(p: Person, role: AppRole) {
    const roles = createClient().from("user_roles");
    const res = p.roles.includes(role)
      ? await roles.delete().eq("user_id", p.id).eq("role", role)
      : await roles.insert({ user_id: p.id, role });
    setActionError(res.error?.message ?? null);
    reload();
  }

  async function toggleActive(p: Person) {
    const res = await createClient().from("profiles").update({ active: !p.active }).eq("id", p.id);
    setActionError(res.error?.message ?? null);
    reload();
  }

  return (
    <div>
      <SectionHeader title={t.admin.sections.users}>
        {isAdmin && (
          <Button onClick={() => setCreating(true)}>
            <Plus size={16} /> {a.newUser}
          </Button>
        )}
      </SectionHeader>
      <ErrorNote error={error ?? actionError} />
      {!isAdmin && <p className="mb-4 text-sm text-silver-dim">{a.adminOnly}</p>}

      <Panel>
        <Table head={[a.fullName, a.email, a.phone, a.roles, a.status, ""]}>
          {data?.map((p) => (
            <tr key={p.id} className={p.active ? "" : "opacity-50"}>
              <td className="font-medium text-white">{p.full_name || "—"}</td>
              <td className="text-silver-dim">{p.email}</td>
              <td className="whitespace-nowrap text-silver-dim">{p.phone}</td>
              <td>
                {isAdmin ? (
                  <RoleChips
                    value={p.roles}
                    t={t}
                    onToggle={(role) => toggleRole(p, role)}
                    disabled={(role) => p.id === me.id && role === "admin"}
                  />
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {p.roles.map((r) => (
                      <Badge key={r} tone="olive">
                        {t.roles[r]}
                      </Badge>
                    ))}
                  </div>
                )}
              </td>
              <td>
                <Badge tone={p.active ? "green" : "red"}>{p.active ? a.active : a.blocked}</Badge>
              </td>
              <td>
                {isAdmin && p.id !== me.id && (
                  <div className="flex justify-end gap-1.5">
                    <IconButton onClick={() => setPasswordFor(p)} title={a.setPassword}>
                      <KeyRound size={14} />
                    </IconButton>
                    <IconButton
                      danger={p.active}
                      onClick={() => toggleActive(p)}
                      title={p.active ? a.deactivate : a.activate}
                    >
                      {p.active ? <UserX size={14} /> : <UserCheck size={14} />}
                    </IconButton>
                  </div>
                )}
              </td>
            </tr>
          ))}
          {data && !data.length && <EmptyRow cols={6}>{a.noUsers}</EmptyRow>}
        </Table>
      </Panel>

      {creating && <NewUserModal t={t} onClose={() => setCreating(false)} onSaved={reload} />}
      {passwordFor && <PasswordModal t={t} person={passwordFor} onClose={() => setPasswordFor(null)} />}
    </div>
  );
}

function NewUserModal({ t, onClose, onSaved }: { t: Dictionary; onClose: () => void; onSaved: () => void }) {
  const a = t.adminUi;
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", password: "" });
  const [roles, setRoles] = useState<AppRole[]>(["worker"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!form.email.trim() || form.password.length < 8) return setError(a.emailPasswordRequired);
    setBusy(true);
    setError(null);
    try {
      const { id } = await callAdminUsers({ action: "create", ...form, roles });
      if (id && form.phone.trim()) must(await createClient().from("profiles").update({ phone: form.phone.trim() }).eq("id", id));
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <Modal title={a.newUser} onClose={onClose}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={a.fullName}>
          <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </Field>
        <Field label={a.phone}>
          <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <Field label={a.email}>
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label={a.initialPassword}>
          <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        <div className="sm:col-span-2">
          <div className="mb-2 text-xs text-silver-dim">{a.roles}</div>
          <RoleChips
            value={roles}
            t={t}
            onToggle={(role) => setRoles(roles.includes(role) ? roles.filter((r) => r !== role) : [...roles, role])}
          />
        </div>
      </div>
      <p className="mt-4 text-xs text-silver-dim">{a.newUserHint}</p>
      <ErrorNote error={error} />
      <ModalActions>
        <Button variant="ghost" onClick={onClose}>
          {a.cancel}
        </Button>
        <Button onClick={save} disabled={busy}>
          {a.create}
        </Button>
      </ModalActions>
    </Modal>
  );
}

function PasswordModal({ t, person, onClose }: { t: Dictionary; person: Person; onClose: () => void }) {
  const a = t.adminUi;
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function save() {
    if (password.length < 8) return setError(a.emailPasswordRequired);
    setBusy(true);
    try {
      await callAdminUsers({ action: "set_password", user_id: person.id, password });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setBusy(false);
  }

  return (
    <Modal title={`${a.setPassword}: ${personName(person)}`} onClose={onClose}>
      {done ? (
        <p className="text-sm text-emerald-300">{a.passwordChanged}</p>
      ) : (
        <Field label={a.initialPassword}>
          <Input value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
      )}
      <ErrorNote error={error} />
      <ModalActions>
        <Button variant="ghost" onClick={onClose}>
          {done ? a.close : a.cancel}
        </Button>
        {!done && (
          <Button onClick={save} disabled={busy}>
            {a.save}
          </Button>
        )}
      </ModalActions>
    </Modal>
  );
}
