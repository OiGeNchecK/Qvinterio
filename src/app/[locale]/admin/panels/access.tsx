"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { Button } from "@/components/button";
import { createClient } from "@/lib/supabase/client";
import { dateLocale, type Dictionary, type Locale } from "@/i18n";
import { Badge, Empty, ErrorNote, Field, Input, SectionHeader, Select, must, useLoad } from "../kit";
import { loadPeople, loadProjectRefs, personName } from "../data";

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
  const [form, setForm] = useState({ client_id: "", project_id: "", until: inDays(30) });
  const [actionError, setActionError] = useState<string | null>(null);
  const dateFormat = new Intl.DateTimeFormat(dateLocale(locale), { dateStyle: "medium" });

  const people = new Map(data?.people.map((p) => [p.id, p]));
  const projects = new Map(data?.projects.map((p) => [p.id, p.name]));
  const clients = data?.people.filter((p) => p.active && p.roles.includes("client")) ?? [];

  async function run(action: PromiseLike<{ error: { message: string } | null }>) {
    const { error } = await action;
    setActionError(error?.message ?? null);
    reload();
  }

  function grant() {
    if (!form.client_id || !form.project_id || !form.until) return setActionError(a.fillAll);
    run(
      createClient().from("client_access").insert({
        client_id: form.client_id,
        project_id: form.project_id,
        expires_at: endOfDay(form.until),
      }),
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader title={t.admin.sections.access} />
      <ErrorNote error={error ?? actionError} />

      <Card className="space-y-4">
        <h2 className="font-medium text-white">{a.grantAccess}</h2>
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_12rem_auto] sm:items-end">
          <Field label={t.roles.client}>
            <Select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
              <option value="">–</option>
              {clients.map((p) => (
                <option key={p.id} value={p.id}>
                  {personName(p)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={a.site}>
            <Select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
              <option value="">–</option>
              {data?.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t.client.validUntil}>
            <Input type="date" value={form.until} onChange={(e) => setForm({ ...form, until: e.target.value })} />
          </Field>
          <Button onClick={grant}>{a.grant}</Button>
        </div>
        <p className="text-xs text-silver-dim">{a.clientHint}</p>
      </Card>

      <Card className="p-0">
        {data && !data.grants.length ? (
          <Empty>{a.noGrants}</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {data?.grants.map((g) => {
              const active = !g.revoked_at && new Date(g.expires_at) > new Date();
              return (
                <li
                  key={g.id}
                  className="grid gap-2 px-5 py-4 text-sm sm:grid-cols-[1.2fr_1.2fr_1fr_auto] sm:items-center"
                >
                  <span className="text-white">{personName(people.get(g.client_id))}</span>
                  <span className="text-silver">{projects.get(g.project_id)}</span>
                  <span className="flex items-center gap-2">
                    <Badge tone={active ? "olive" : "dim"}>
                      {g.revoked_at ? a.revoked : active ? a.active : a.expired}
                    </Badge>
                    <span className="text-xs text-silver-dim">{dateFormat.format(new Date(g.expires_at))}</span>
                  </span>
                  <span className="flex gap-3 text-xs">
                    <button
                      onClick={() =>
                        run(
                          createClient()
                            .from("client_access")
                            .update({
                              revoked_at: null,
                              expires_at: new Date(Math.max(Date.now(), +new Date(g.expires_at)) + 30 * DAY).toISOString(),
                            })
                            .eq("id", g.id),
                        )
                      }
                      className="text-silver-dim hover:text-white"
                    >
                      {a.extend30}
                    </button>
                    {active && (
                      <button
                        onClick={() =>
                          run(
                            createClient()
                              .from("client_access")
                              .update({ revoked_at: new Date().toISOString() })
                              .eq("id", g.id),
                          )
                        }
                        className="text-silver-dim hover:text-red-300"
                      >
                        {a.revoke}
                      </button>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
