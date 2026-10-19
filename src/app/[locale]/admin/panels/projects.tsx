"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, ProgressBar } from "@/components/ui";
import { Button } from "@/components/button";
import { createClient } from "@/lib/supabase/client";
import type { Dictionary, Locale } from "@/i18n";
import { Badge, Empty, ErrorNote, Field, Input, SectionHeader, Select, Textarea, emptyToNull, must, toDateInput, useLoad } from "../kit";
import {
  PROJECT_STATUSES,
  STAGE_STATUSES,
  isStaffPerson,
  loadPeople,
  personName,
  type Person,
  type ProjectStatus,
  type StageStatus,
} from "../data";

type Project = {
  id: string;
  name: string;
  address: string | null;
  description: string | null;
  status: ProjectStatus;
  progress: number;
  manager_id: string | null;
  start_date: string | null;
  end_date: string | null;
  project_members: { user_id: string }[];
};

type Stage = { id: string; title: string; position: number; status: StageStatus; progress: number };

async function loadAll() {
  const [projects, people] = await Promise.all([
    createClient()
      .from("projects")
      .select("id, name, address, description, status, progress, manager_id, start_date, end_date, project_members(user_id)")
      .order("created_at", { ascending: false }),
    loadPeople(),
  ]);
  return { projects: must<Project[]>(projects), people };
}

export function ProjectsSection({ locale, t }: { locale: Locale; t: Dictionary }) {
  const { data, error, reload } = useLoad(loadAll);
  const [editing, setEditing] = useState<Project | "new" | null>(null);
  const a = t.adminUi;
  const people = new Map(data?.people.map((p) => [p.id, p]));

  if (editing && data) {
    return (
      <ProjectForm
        locale={locale}
        t={t}
        project={editing === "new" ? null : editing}
        people={data.people}
        onClose={() => {
          setEditing(null);
          reload();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader title={t.admin.sections.projects}>
        <Button onClick={() => setEditing("new")}>+ {a.newProject}</Button>
      </SectionHeader>
      <ErrorNote error={error} />
      {data && !data.projects.length && (
        <Card>
          <Empty>{a.noProjects}</Empty>
        </Card>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {data?.projects.map((p) => (
          <button key={p.id} onClick={() => setEditing(p)} className="text-left">
            <Card className="h-full space-y-3 transition hover:border-olive/60">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-white">{p.name}</div>
                  <div className="text-xs text-silver-dim">{p.address}</div>
                </div>
                <Badge tone={p.status === "active" ? "olive" : "dim"}>{a.projectStatus[p.status]}</Badge>
              </div>
              <ProgressBar value={p.progress} />
              <div className="flex justify-between text-xs text-silver-dim">
                <span>
                  {a.siteManager}: {personName(people.get(p.manager_id ?? ""))}
                </span>
                <span>
                  {p.project_members.length} {a.membersShort}
                </span>
              </div>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}

function ProjectForm({
  locale,
  t,
  project,
  people,
  onClose,
}: {
  locale: Locale;
  t: Dictionary;
  project: Project | null;
  people: Person[];
  onClose: () => void;
}) {
  const a = t.adminUi;
  const [form, setForm] = useState({
    name: project?.name ?? "",
    address: project?.address ?? "",
    description: project?.description ?? "",
    status: project?.status ?? ("planned" as ProjectStatus),
    progress: project?.progress ?? 0,
    manager_id: project?.manager_id ?? "",
    start_date: toDateInput(project?.start_date ?? null),
    end_date: toDateInput(project?.end_date ?? null),
  });
  const [members, setMembers] = useState(new Set(project?.project_members.map((m) => m.user_id)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const team = people.filter((p) => p.active && !p.roles.includes("client") && p.roles.length > 0);

  async function save() {
    if (!form.name.trim()) return setError(a.nameRequired);
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const row = {
      name: form.name.trim(),
      address: emptyToNull(form.address),
      description: emptyToNull(form.description),
      status: form.status,
      progress: Math.max(0, Math.min(100, Number(form.progress) || 0)),
      manager_id: form.manager_id || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    };
    try {
      const saved = must<{ id: string }>(
        project
          ? await supabase.from("projects").update(row).eq("id", project.id).select("id").single()
          : await supabase.from("projects").insert(row).select("id").single(),
      );
      const before = new Set(project?.project_members.map((m) => m.user_id));
      const added = [...members].filter((id) => !before.has(id));
      const removed = [...before].filter((id) => !members.has(id));
      if (added.length)
        must(await supabase.from("project_members").insert(added.map((user_id) => ({ project_id: saved.id, user_id }))));
      if (removed.length)
        must(await supabase.from("project_members").delete().eq("project_id", saved.id).in("user_id", removed));
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  async function remove() {
    if (!project || !window.confirm(a.confirmDelete)) return;
    const { error } = await createClient().from("projects").delete().eq("id", project.id);
    if (error) return setError(error.message);
    onClose();
  }

  return (
    <div className="space-y-6">
      <SectionHeader title={project ? project.name : a.newProject}>
        {project && (
          <Link
            href={`/${locale}/admin/orders/?project=${project.id}`}
            className="rounded-full border border-line px-4 py-2 text-sm hover:border-olive"
          >
            {a.orderHistory}
          </Link>
        )}
        <Button variant="ghost" onClick={onClose}>
          {a.back}
        </Button>
      </SectionHeader>

      <Card className="grid gap-4 sm:grid-cols-2">
        <Field label={a.name}>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label={a.address}>
          <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </Field>
        <Field label={a.status}>
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}>
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {a.projectStatus[s]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={`${t.common.progress} (%)`}>
          <Input
            type="number"
            min={0}
            max={100}
            value={form.progress}
            onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })}
          />
        </Field>
        <Field label={a.siteManagerHint}>
          <Select value={form.manager_id} onChange={(e) => setForm({ ...form, manager_id: e.target.value })}>
            <option value="">–</option>
            {people.filter(isStaffPerson).map((p) => (
              <option key={p.id} value={p.id}>
                {personName(p)}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={a.startDate}>
            <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          </Field>
          <Field label={a.endDate}>
            <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </Field>
        </div>
        <Field label={a.description} className="sm:col-span-2">
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <div className="sm:col-span-2">
          <div className="mb-2 text-xs text-silver-dim">{a.members}</div>
          {team.length ? (
            <div className="flex flex-wrap gap-2">
              {team.map((p) => {
                const on = members.has(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      const next = new Set(members);
                      if (on) next.delete(p.id);
                      else next.add(p.id);
                      setMembers(next);
                    }}
                    className={`rounded-full border px-3 py-1 text-sm transition ${
                      on ? "border-olive bg-olive/20 text-white" : "border-line text-silver-dim hover:border-olive/60"
                    }`}
                  >
                    {personName(p)}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-silver-dim">{a.noTeam}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <Button onClick={save} disabled={busy}>
            {a.save}
          </Button>
          {project && (
            <Button variant="ghost" onClick={remove} disabled={busy}>
              {a.delete}
            </Button>
          )}
        </div>
        <div className="sm:col-span-2">
          <ErrorNote error={error} />
        </div>
      </Card>

      {project && <StagesEditor projectId={project.id} t={t} />}
    </div>
  );
}

function StagesEditor({ projectId, t }: { projectId: string; t: Dictionary }) {
  const a = t.adminUi;
  const { data, error, reload } = useLoad(async () =>
    must<Stage[]>(
      await createClient()
        .from("project_stages")
        .select("id, title, position, status, progress")
        .eq("project_id", projectId)
        .order("position"),
    ),
  );
  const [title, setTitle] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  async function run(action: PromiseLike<{ error: { message: string } | null }>) {
    const { error } = await action;
    setActionError(error?.message ?? null);
    reload();
  }

  const stages = createClient().from("project_stages");

  return (
    <Card className="space-y-4">
      <h2 className="font-medium text-white">{t.client.stages}</h2>
      <ErrorNote error={error ?? actionError} />
      <ul className="divide-y divide-line">
        {data?.map((s) => (
          <li key={s.id} className="grid gap-3 py-3 sm:grid-cols-[1fr_10rem_6rem_auto] sm:items-center">
            <span className="text-sm text-silver">{s.title}</span>
            <Select
              value={s.status}
              onChange={(e) => run(stages.update({ status: e.target.value }).eq("id", s.id))}
            >
              {STAGE_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {t.stageStatus[st]}
                </option>
              ))}
            </Select>
            <Input
              type="number"
              min={0}
              max={100}
              defaultValue={s.progress}
              onBlur={(e) =>
                Number(e.target.value) !== s.progress &&
                run(stages.update({ progress: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }).eq("id", s.id))
              }
            />
            <button
              onClick={() => window.confirm(a.confirmDelete) && run(stages.delete().eq("id", s.id))}
              className="text-xs text-silver-dim hover:text-red-300"
            >
              {a.delete}
            </button>
          </li>
        ))}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          run(stages.insert({ project_id: projectId, title: title.trim(), position: data?.length ?? 0 }));
          setTitle("");
        }}
      >
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={a.newStage} />
        <Button type="submit">{a.add}</Button>
      </form>
    </Card>
  );
}
