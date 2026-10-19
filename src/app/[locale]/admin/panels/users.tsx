"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { Button } from "@/components/button";
import { createClient } from "@/lib/supabase/client";
import { useUser, type AppRole } from "@/lib/auth";
import type { Dictionary } from "@/i18n";
import { Badge, Empty, ErrorNote, Field, Input, SectionHeader, must, useLoad } from "../kit";
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
  return data as { id?: string };
}

export function UsersSection({ t }: { t: Dictionary }) {
  const a = t.adminUi;
  const me = useUser();
  const isAdmin = me.roles.includes("admin");
  const { data, error, reload } = useLoad(loadPeople);
  const [creating, setCreating] = useState(false);
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

  async function resetPassword(p: Person) {
    const password = window.prompt(a.newPasswordFor.replace("{name}", personName(p)));
    if (!password) return;
    try {
      await callAdminUsers({ action: "set_password", user_id: p.id, password });
      setActionError(null);
      window.alert(a.passwordChanged);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader title={t.admin.sections.users}>
        {isAdmin && <Button onClick={() => setCreating(true)}>+ {a.newUser}</Button>}
      </SectionHeader>
      <ErrorNote error={error ?? actionError} />
      {!isAdmin && <p className="text-sm text-silver-dim">{a.adminOnly}</p>}

      {creating && (
        <NewUserForm
          t={t}
          onClose={() => {
            setCreating(false);
            reload();
          }}
        />
      )}

      <Card className="p-0">
        {data && !data.length ? (
          <Empty>{a.noUsers}</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {data?.map((p) => (
              <li
                key={p.id}
                className={`grid gap-3 px-5 py-4 text-sm lg:grid-cols-[1.4fr_2fr_auto] lg:items-center ${
                  p.active ? "" : "opacity-50"
                }`}
              >
                <div>
                  <div className="text-white">{p.full_name || "–"}</div>
                  <div className="text-xs text-silver-dim">
                    {p.email}
                    {p.phone && ` · ${p.phone}`}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ROLES.map((role) => {
                    const on = p.roles.includes(role);
                    return isAdmin ? (
                      <button
                        key={role}
                        onClick={() => toggleRole(p, role)}
                        disabled={p.id === me.id && role === "admin"}
                        className={`rounded-full border px-2.5 py-0.5 text-xs transition disabled:cursor-not-allowed ${
                          on ? "border-olive bg-olive/20 text-white" : "border-line text-silver-dim hover:border-olive/60"
                        }`}
                      >
                        {t.roles[role]}
                      </button>
                    ) : (
                      on && (
                        <Badge key={role} tone="olive">
                          {t.roles[role]}
                        </Badge>
                      )
                    );
                  })}
                </div>
                {isAdmin && p.id !== me.id && (
                  <div className="flex gap-3 text-xs">
                    <button onClick={() => resetPassword(p)} className="text-silver-dim hover:text-white">
                      {a.setPassword}
                    </button>
                    <button onClick={() => toggleActive(p)} className="text-silver-dim hover:text-white">
                      {p.active ? a.deactivate : a.activate}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function NewUserForm({ t, onClose }: { t: Dictionary; onClose: () => void }) {
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
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <Card className="grid gap-4 sm:grid-cols-2">
      <Field label={a.fullName}>
        <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
      </Field>
      <Field label={a.email}>
        <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </Field>
      <Field label={a.phone}>
        <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </Field>
      <Field label={a.initialPassword}>
        <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      </Field>
      <div className="sm:col-span-2">
        <div className="mb-2 text-xs text-silver-dim">{a.roles}</div>
        <div className="flex flex-wrap gap-1.5">
          {ROLES.map((role) => {
            const on = roles.includes(role);
            return (
              <button
                key={role}
                type="button"
                onClick={() => setRoles(on ? roles.filter((r) => r !== role) : [...roles, role])}
                className={`rounded-full border px-3 py-1 text-sm transition ${
                  on ? "border-olive bg-olive/20 text-white" : "border-line text-silver-dim hover:border-olive/60"
                }`}
              >
                {t.roles[role]}
              </button>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-silver-dim sm:col-span-2">{a.newUserHint}</p>
      <div className="flex gap-3 sm:col-span-2">
        <Button onClick={save} disabled={busy}>
          {a.create}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          {a.cancel}
        </Button>
      </div>
      <div className="sm:col-span-2">
        <ErrorNote error={error} />
      </div>
    </Card>
  );
}
