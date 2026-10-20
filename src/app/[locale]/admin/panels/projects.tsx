"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarDays, History, ListChecks, Pencil, Plus, Trash2 } from "lucide-react";
import { ProgressBar } from "@/components/ui";
import { Button } from "@/components/button";
import { createClient } from "@/lib/supabase/client";
import type { Dictionary, Locale } from "@/i18n";
import {
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
  StatusMenu,
  Table,
  Textarea,
  emptyToNull,
  must,
  toDateInput,
  useLoad,
} from "../kit";
import { TasksModal } from "./tasks";
import {
  PROJECT_STATUSES,
  STAGE_STATUSES,
  formatDateRange,
  isStaffPerson,
  loadPeople,
  personName,
  projectStatusTone,
  stageStatusTone,
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

type Stage = {
  id: string;
  title: string;
  position: number;
  status: StageStatus;
  progress: number;
  started_at: string | null;
  finished_at: string | null;
};

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
  const [tasksOf, setTasksOf] = useState<Project | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const a = t.adminUi;
  const people = new Map(data?.people.map((p) => [p.id, p]));

  async function run(action: PromiseLike<{ error: { message: string } | null }>) {
    const { error } = await action;
    setActionError(error?.message ?? null);
    reload();
  }

  return (
    <div>
      <SectionHeader title={t.admin.sections.projects}>
        <Button onClick={() => setEditing("new")}>
          <Plus size={16} /> {a.newProject}
        </Button>
      </SectionHeader>
      <ErrorNote error={error ?? actionError} />

      <Panel>
        <Table head={[a.name, a.address, a.siteManager, a.membersShort, t.common.progress, a.status, ""]}>
          {data?.projects.map((p) => (
            <tr key={p.id}>
              <td className="font-medium text-white">{p.name}</td>
              <td className="text-silver-dim">{p.address}</td>
              <td className="text-silver-dim">{personName(people.get(p.manager_id ?? ""))}</td>
              <td className="text-silver-dim">{p.project_members.length}</td>
              <td className="w-40">
                <div className="mb-1 text-xs text-silver-dim">{p.progress}%</div>
                <ProgressBar value={p.progress} />
              </td>
              <td>
                <StatusMenu
                  value={p.status}
                  options={PROJECT_STATUSES}
                  label={(s) => a.projectStatus[s]}
                  tone={projectStatusTone}
                  onChange={(status) => run(createClient().from("projects").update({ status }).eq("id", p.id))}
                />
              </td>
              <td>
                <div className="flex justify-end gap-1.5">
                  <Link
                    href={`/${locale}/admin/orders/?project=${p.id}`}
                    title={a.orderHistory}
                    className="inline-flex items-center justify-center rounded-md border border-line p-1.5 text-silver transition hover:border-gold hover:text-gold"
                  >
                    <History size={14} />
                  </Link>
                  <IconButton onClick={() => setTasksOf(p)} title={t.tasks.manage}>
                    <ListChecks size={14} />
                  </IconButton>
                  <IconButton onClick={() => setEditing(p)} title={a.edit}>
                    <Pencil size={14} />
                  </IconButton>
                  <IconButton
                    danger
                    title={a.delete}
                    onClick={() =>
                      window.confirm(a.confirmDelete) && run(createClient().from("projects").delete().eq("id", p.id))
                    }
                  >
                    <Trash2 size={14} />
                  </IconButton>
                </div>
              </td>
            </tr>
          ))}
          {data && !data.projects.length && <EmptyRow cols={7}>{a.noProjects}</EmptyRow>}
        </Table>
      </Panel>

      {editing && data && (
        <ProjectModal
          t={t}
          locale={locale}
          project={editing === "new" ? null : editing}
          people={data.people}
          onClose={() => setEditing(null)}
          onSaved={reload}
        />
      )}
      {tasksOf && <TasksModal project={tasksOf} locale={locale} t={t} onClose={() => setTasksOf(null)} />}
    </div>
  );
}

function ProjectModal({
  t,
  locale,
  project,
  people,
  onClose,
  onSaved,
}: {
  t: Dictionary;
  locale: Locale;
  project: Project | null;
  people: Person[];
  onClose: () => void;
  onSaved: () => void;
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
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <Modal title={project ? project.name : a.newProject} onClose={onClose} wide>
      <div className="grid gap-4 sm:grid-cols-2">
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
            <option value="">—</option>
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
                    className={`rounded-md border px-3 py-1 text-sm transition ${
                      on ? "border-gold bg-gold/15 text-gold" : "border-line text-silver-dim hover:border-gold/60"
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
      </div>

      <ErrorNote error={error} />
      <ModalActions>
        <Button variant="ghost" onClick={onClose}>
          {a.cancel}
        </Button>
        <Button onClick={save} disabled={busy}>
          {a.save}
        </Button>
      </ModalActions>

      {project && <StagesEditor projectId={project.id} locale={locale} t={t} />}
    </Modal>
  );
}

function StagesEditor({ projectId, locale, t }: { projectId: string; locale: Locale; t: Dictionary }) {
  const a = t.adminUi;
  const { data, error, reload } = useLoad(async () =>
    must<Stage[]>(
      await createClient()
        .from("project_stages")
        .select("id, title, position, status, progress, started_at, finished_at")
        .eq("project_id", projectId)
        .order("position"),
    ),
  );
  const [title, setTitle] = useState("");
  const [dating, setDating] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function run(action: PromiseLike<{ error: { message: string } | null }>) {
    const { error } = await action;
    setActionError(error?.message ?? null);
    reload();
  }

  const stages = () => createClient().from("project_stages");

  return (
    <div className="mt-8 border-t border-line pt-6">
      <h4 className="mb-3 font-display text-lg text-gold">{t.client.stages}</h4>
      <ErrorNote error={error ?? actionError} />
      <ul className="divide-y divide-line">
        {data?.map((s) => (
          <li key={s.id} className="py-2.5">
            <div className="grid grid-cols-[1fr_auto_4.5rem_auto_auto] items-center gap-2 sm:gap-3">
              <div className="min-w-0">
                <div className="text-sm text-silver">{s.title}</div>
                {(s.started_at || s.finished_at) && (
                  <div className="mt-0.5 text-xs text-silver-dim">
                    {formatDateRange(s.started_at, s.finished_at, locale)}
                  </div>
                )}
              </div>
              <StatusMenu
                value={s.status}
                options={STAGE_STATUSES}
                label={(st) => t.stageStatus[st]}
                tone={stageStatusTone}
                onChange={(status) => run(stages().update({ status }).eq("id", s.id))}
              />
              <Input
                type="number"
                min={0}
                max={100}
                defaultValue={s.progress}
                className="py-1"
                onBlur={(e) =>
                  Number(e.target.value) !== s.progress &&
                  run(stages().update({ progress: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }).eq("id", s.id))
                }
              />
              <IconButton
                title={t.tasks.setPeriod}
                onClick={() => setDating(dating === s.id ? null : s.id)}
              >
                <CalendarDays size={14} />
              </IconButton>
              <IconButton
                danger
                title={a.delete}
                onClick={() => window.confirm(a.confirmDelete) && run(stages().delete().eq("id", s.id))}
              >
                <Trash2 size={14} />
              </IconButton>
            </div>
            {dating === s.id && (
              <PeriodForm
                t={t}
                from={s.started_at}
                to={s.finished_at}
                onCancel={() => setDating(null)}
                onSave={(started_at, finished_at) => {
                  setDating(null);
                  run(stages().update({ started_at, finished_at }).eq("id", s.id));
                }}
              />
            )}
          </li>
        ))}
      </ul>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          run(stages().insert({ project_id: projectId, title: title.trim(), position: data?.length ?? 0 }));
          setTitle("");
        }}
      >
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={a.newStage} />
        <Button type="submit" variant="ghost">
          <Plus size={16} /> {a.add}
        </Button>
      </form>
    </div>
  );
}

// From–to calendar fields for a stage.
function PeriodForm({
  t,
  from,
  to,
  onSave,
  onCancel,
}: {
  t: Dictionary;
  from: string | null;
  to: string | null;
  onSave: (from: string | null, to: string | null) => void;
  onCancel: () => void;
}) {
  const [range, setRange] = useState({ from: toDateInput(from), to: toDateInput(to) });
  const invalid = !!range.from && !!range.to && range.to < range.from;

  return (
    <div className="mt-3 rounded-lg border border-line bg-panel-2/60 p-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label={t.tasks.from}>
          <Input
            type="date"
            value={range.from}
            onChange={(e) => {
              const v = e.target.value;
              setRange({ from: v, to: range.to && v && range.to < v ? v : range.to });
            }}
          />
        </Field>
        <Field label={t.tasks.to}>
          <Input type="date" value={range.to} min={range.from || undefined} onChange={(e) => setRange({ ...range, to: e.target.value })} />
        </Field>
      </div>
      {invalid && <p className="mt-2 text-xs text-red-300">{t.tasks.endBeforeStart}</p>}
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          {t.adminUi.cancel}
        </Button>
        <Button disabled={invalid} onClick={() => onSave(range.from || null, range.to || null)}>
          {t.adminUi.save}
        </Button>
      </div>
    </div>
  );
}
