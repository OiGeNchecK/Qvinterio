"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Dictionary, Locale } from "@/i18n";
import { Badge, ErrorNote, toneClass, useLoad } from "../admin/kit";
import { TASK_STATUSES, taskStatusTone, type TaskStatus } from "../admin/data";
import { TaskDates, TaskThread, commentCount, loadTasks, type SiteTask } from "../admin/panels/tasks";
import type { WorkerSite } from "./worker-home";

// The site's tasks from the Bauleitung; the team sets the status and comments.
export function SiteTasks({ site, locale, t }: { site: WorkerSite; locale: Locale; t: Dictionary }) {
  const k = t.tasks;
  const { data, error, reload } = useLoad(() => loadTasks(site.id));
  const [showDone, setShowDone] = useState(false);
  const open = data?.filter((x) => x.status !== "done") ?? [];
  const done = data?.filter((x) => x.status === "done") ?? [];

  return (
    <div className="space-y-4">
      <p className="text-sm text-silver-dim">{k.workerHint}</p>
      <ErrorNote error={error} />
      {data && !data.length && (
        <p className="rounded-xl border border-line bg-panel/70 px-4 py-6 text-center text-sm text-silver-dim">{k.noTasks}</p>
      )}
      <ul className="space-y-3">
        {[...open, ...(showDone ? done : [])].map((task) => (
          <TaskCard key={task.id} task={task} locale={locale} t={t} onChanged={reload} />
        ))}
      </ul>
      {done.length > 0 && (
        <button
          onClick={() => setShowDone(!showDone)}
          className="w-full rounded-xl border border-line py-3 text-sm text-silver-dim hover:text-gold sm:w-auto sm:px-4 sm:py-2"
        >
          {showDone ? k.hideDone : k.showDone.replace("{n}", String(done.length))}
        </button>
      )}
    </div>
  );
}

function TaskCard({ task, locale, t, onChanged }: { task: SiteTask; locale: Locale; t: Dictionary; onChanged: () => void }) {
  const k = t.tasks;
  const [status, setStatus] = useState(task.status);
  const [showThread, setShowThread] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function change(next: TaskStatus) {
    if (next === status) return;
    const before = status;
    setStatus(next);
    const { error } = await createClient().from("site_tasks").update({ status: next }).eq("id", task.id);
    if (error) setStatus(before);
    setError(error?.message ?? null);
    onChanged();
  }

  return (
    <li className="rounded-xl border border-line bg-panel/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium text-white">{task.title}</div>
          <TaskDates task={{ ...task, status }} locale={locale} t={t} />
        </div>
        <Badge tone={taskStatusTone(status)}>{k.status[status]}</Badge>
      </div>
      {task.description && <p className="mt-2 whitespace-pre-line text-sm text-silver-dim">{task.description}</p>}

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {TASK_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => change(s)}
            aria-pressed={s === status}
            className={`rounded-lg border px-2 py-2.5 text-sm transition ${
              s === status ? `${toneClass[taskStatusTone(s)]} font-medium` : "border-line text-silver-dim hover:border-gold/60"
            }`}
          >
            {k.status[s]}
          </button>
        ))}
      </div>
      <ErrorNote error={error} />

      <button
        onClick={() => setShowThread(!showThread)}
        className="mt-3 inline-flex items-center gap-1.5 py-1.5 text-sm text-silver-dim hover:text-gold"
      >
        <MessageSquare size={15} /> {k.commentCount.replace("{n}", String(commentCount(task)))}
      </button>
      {showThread && <TaskThread taskId={task.id} locale={locale} t={t} onChanged={onChanged} />}
    </li>
  );
}
