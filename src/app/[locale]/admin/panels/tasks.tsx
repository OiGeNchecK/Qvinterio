"use client";

import { useState } from "react";
import { CalendarDays, MessageSquare, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/button";
import { createClient } from "@/lib/supabase/client";
import { isStaff, useUser } from "@/lib/auth";
import { dateLocale, type Dictionary, type Locale } from "@/i18n";
import {
  Badge,
  ErrorNote,
  Field,
  IconButton,
  Input,
  Modal,
  Select,
  StatusMenu,
  Textarea,
  emptyToNull,
  must,
  toDateInput,
  useLoad,
} from "../kit";
import { TASK_STATUSES, formatDateRange, personName, taskStatusTone, type TaskStatus } from "../data";

export type SiteTask = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  site_task_comments: { status: TaskStatus | null }[];
};

type TaskComment = {
  id: number;
  author_id: string | null;
  status: TaskStatus | null;
  body: string | null;
  created_at: string;
  author: { full_name: string; email: string | null } | null;
};

// Open tasks first, each group by start date; tasks without dates last.
export async function loadTasks(projectId: string) {
  const tasks = must<SiteTask[]>(
    await createClient()
      .from("site_tasks")
      .select("id, title, description, status, start_date, end_date, created_at, site_task_comments(status)")
      .eq("project_id", projectId),
  );
  const key = (t: SiteTask) => `${t.status === "done" ? 1 : 0}|${t.start_date ?? t.end_date ?? "9999"}|${t.created_at}`;
  return tasks.sort((a, b) => key(a).localeCompare(key(b)));
}

export const commentCount = (task: SiteTask) => task.site_task_comments.filter((c) => !c.status).length;

export function isOverdue(task: SiteTask) {
  return task.status !== "done" && !!task.end_date && task.end_date < new Date().toISOString().slice(0, 10);
}

// Admins and the Bauleiter write the tasks of one site.
export function TasksModal({
  project,
  locale,
  t,
  onClose,
}: {
  project: { id: string; name: string };
  locale: Locale;
  t: Dictionary;
  onClose: () => void;
}) {
  const k = t.tasks;
  const { data, error, reload } = useLoad(() => loadTasks(project.id));
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [thread, setThread] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const tasks = () => createClient().from("site_tasks");

  async function run(action: PromiseLike<{ error: { message: string } | null }>) {
    const { error } = await action;
    setActionError(error?.message ?? null);
    reload();
  }

  const open = data?.filter((x) => x.status !== "done") ?? [];
  const done = data?.filter((x) => x.status === "done") ?? [];

  return (
    <Modal title={`${k.title} · ${project.name}`} onClose={onClose} wide>
      {editing === "new" ? (
        <TaskForm
          projectId={project.id}
          task={null}
          t={t}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      ) : (
        <Button onClick={() => setEditing("new")}>
          <Plus size={16} /> {k.newTask}
        </Button>
      )}
      <ErrorNote error={error ?? actionError} />

      {data && !data.length && <p className="mt-6 text-sm text-silver-dim">{k.noTasks}</p>}
      <ul className="mt-5 space-y-3">
        {[...open, ...(showDone ? done : [])].map((task) =>
          editing === task.id ? (
            <li key={task.id}>
              <TaskForm
                projectId={project.id}
                task={task}
                t={t}
                onCancel={() => setEditing(null)}
                onSaved={() => {
                  setEditing(null);
                  reload();
                }}
              />
            </li>
          ) : (
            <li key={task.id} className="rounded-xl border border-line bg-panel-2/40 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-white">{task.title}</div>
                  <TaskDates task={task} locale={locale} t={t} />
                </div>
                <div className="flex items-center gap-1.5">
                  <StatusMenu
                    value={task.status}
                    options={TASK_STATUSES}
                    label={(s) => k.status[s]}
                    tone={taskStatusTone}
                    onChange={(status) => run(tasks().update({ status }).eq("id", task.id))}
                  />
                  <IconButton onClick={() => setEditing(task.id)} title={t.adminUi.edit}>
                    <Pencil size={14} />
                  </IconButton>
                  <IconButton
                    danger
                    title={t.adminUi.delete}
                    onClick={() => window.confirm(k.confirmDelete) && run(tasks().delete().eq("id", task.id))}
                  >
                    <Trash2 size={14} />
                  </IconButton>
                </div>
              </div>
              {task.description && <p className="mt-2 whitespace-pre-line text-sm text-silver-dim">{task.description}</p>}
              <button
                onClick={() => setThread(thread === task.id ? null : task.id)}
                className="mt-2 inline-flex items-center gap-1.5 py-1 text-xs text-silver-dim hover:text-gold"
              >
                <MessageSquare size={13} /> {k.commentCount.replace("{n}", String(commentCount(task)))}
              </button>
              {thread === task.id && <TaskThread taskId={task.id} locale={locale} t={t} onChanged={reload} />}
            </li>
          ),
        )}
      </ul>
      {done.length > 0 && (
        <button onClick={() => setShowDone(!showDone)} className="mt-4 text-sm text-silver-dim hover:text-gold">
          {showDone ? k.hideDone : k.showDone.replace("{n}", String(done.length))}
        </button>
      )}
    </Modal>
  );
}

function TaskForm({
  projectId,
  task,
  t,
  onCancel,
  onSaved,
}: {
  projectId: string;
  task: SiteTask | null;
  t: Dictionary;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const k = t.tasks;
  const [form, setForm] = useState({
    title: task?.title ?? "",
    description: task?.description ?? "",
    status: task?.status ?? ("open" as TaskStatus),
    start_date: toDateInput(task?.start_date ?? null),
    end_date: toDateInput(task?.end_date ?? null),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!form.title.trim()) return setError(k.titleRequired);
    if (form.start_date && form.end_date && form.end_date < form.start_date) return setError(k.endBeforeStart);
    setBusy(true);
    setError(null);
    const row = {
      title: form.title.trim(),
      description: emptyToNull(form.description),
      status: form.status,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    };
    const supabase = createClient();
    const { error } = task
      ? await supabase.from("site_tasks").update(row).eq("id", task.id)
      : await supabase.from("site_tasks").insert({ ...row, project_id: projectId });
    setBusy(false);
    if (error) return setError(error.message);
    onSaved();
  }

  return (
    <div className="rounded-xl border border-gold/40 bg-panel-2/60 p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={k.taskTitle} className="sm:col-span-2">
          <Input autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
        <Field label={k.description} className="sm:col-span-2">
          <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <Field label={t.adminUi.status}>
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}>
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {k.status[s]}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={k.from}>
            <Input
              type="date"
              value={form.start_date}
              onChange={(e) => {
                const v = e.target.value;
                setForm({ ...form, start_date: v, end_date: form.end_date && v && form.end_date < v ? v : form.end_date });
              }}
            />
          </Field>
          <Field label={k.to}>
            <Input
              type="date"
              value={form.end_date}
              min={form.start_date || undefined}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            />
          </Field>
        </div>
      </div>
      <ErrorNote error={error} />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          {t.adminUi.cancel}
        </Button>
        <Button onClick={save} disabled={busy}>
          {t.adminUi.save}
        </Button>
      </div>
    </div>
  );
}

export function TaskDates({ task, locale, t }: { task: SiteTask; locale: Locale; t: Dictionary }) {
  if (!task.start_date && !task.end_date) return null;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-silver-dim">
      <CalendarDays size={13} className="text-gold" />
      {formatDateRange(task.start_date, task.end_date, locale)}
      {isOverdue(task) && <Badge tone="red">{t.tasks.overdue}</Badge>}
    </div>
  );
}

// Comments and status changes of one task, oldest first, with a field to write.
export function TaskThread({
  taskId,
  locale,
  t,
  onChanged,
}: {
  taskId: string;
  locale: Locale;
  t: Dictionary;
  onChanged: () => void;
}) {
  const k = t.tasks;
  const me = useUser();
  const staff = isStaff(me);
  const { data, error, reload } = useLoad(async () =>
    must<TaskComment[]>(
      await createClient()
        .from("site_task_comments")
        .select("id, author_id, status, body, created_at, author:profiles(full_name, email)")
        .eq("task_id", taskId)
        .order("created_at")
        .overrideTypes<TaskComment[], { merge: false }>(),
    ),
  );
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const dateTime = new Intl.DateTimeFormat(dateLocale(locale), { dateStyle: "short", timeStyle: "short" });

  async function send() {
    if (!body.trim()) return;
    setBusy(true);
    const { error } = await createClient()
      .from("site_task_comments")
      .insert({ task_id: taskId, author_id: me.id, body: body.trim() });
    setBusy(false);
    setActionError(error?.message ?? null);
    if (!error) setBody("");
    reload();
    onChanged();
  }

  async function remove(id: number) {
    if (!window.confirm(k.confirmDeleteComment)) return;
    const { error } = await createClient().from("site_task_comments").delete().eq("id", id);
    setActionError(error?.message ?? null);
    reload();
    onChanged();
  }

  return (
    <div className="mt-3 border-t border-line pt-3">
      <ErrorNote error={error ?? actionError} />
      {data && !data.length && <p className="text-sm text-silver-dim">{k.noComments}</p>}
      <ol className="space-y-3">
        {data?.map((c) => {
          const who = c.author_id === me.id ? k.you : personName(c.author);
          return c.status ? (
            <li key={c.id} className="flex flex-wrap items-center gap-2 text-xs text-silver-dim">
              <span>{dateTime.format(new Date(c.created_at))}</span>
              <span>·</span>
              <span>{who}</span>
              <Badge tone={taskStatusTone(c.status)}>{k.status[c.status]}</Badge>
            </li>
          ) : (
            <li key={c.id} className="rounded-lg border border-line bg-panel/70 px-3 py-2">
              <div className="flex items-center justify-between gap-2 text-xs text-silver-dim">
                <span>
                  <span className={c.author_id === me.id ? "text-gold" : "text-silver"}>{who}</span> ·{" "}
                  {dateTime.format(new Date(c.created_at))}
                </span>
                {(staff || c.author_id === me.id) && (
                  <button onClick={() => remove(c.id)} title={t.adminUi.delete} className="p-1 text-silver-dim hover:text-red-400">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              <p className="mt-1 whitespace-pre-line text-sm text-silver">{c.body}</p>
            </li>
          );
        })}
      </ol>
      <div className="mt-3 flex items-end gap-2">
        <Textarea
          rows={2}
          value={body}
          placeholder={k.commentPlaceholder}
          onChange={(e) => setBody(e.target.value)}
          className="min-h-0 flex-1"
        />
        <Button onClick={send} disabled={busy || !body.trim()} aria-label={k.send} className="shrink-0">
          <Send size={16} />
        </Button>
      </div>
    </div>
  );
}
