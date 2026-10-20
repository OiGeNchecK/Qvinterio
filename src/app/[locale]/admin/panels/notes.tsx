"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Mail, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/button";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/auth";
import { dateLocale, type Dictionary, type Locale } from "@/i18n";
import {
  NOTE_SELECT,
  KindBadge,
  NoteThread,
  PinnedPhoto,
  StatusBadge,
  loadUnreadNoteIds,
  markNoteRead,
  photoPins,
  prepareNotes,
  signPhotoUrls,
  type Note,
  type NoteStatus,
} from "@/components/site-notes";
import { ErrorNote, IconButton, Modal, Panel, SectionHeader, Select, must, useLoad } from "../kit";
import { loadPeople, loadProjectRefs, personName, type Person } from "../data";

type Filter = "unread" | "open" | "done" | "all";

async function loadNotes() {
  const [notes, projects, people, unread] = await Promise.all([
    createClient()
      .from("client_notes")
      .select(NOTE_SELECT)
      .order("created_at", { ascending: false })
      .limit(500)
      .overrideTypes<Note[], { merge: false }>(),
    loadProjectRefs(),
    loadPeople(),
    loadUnreadNoteIds(),
  ]);
  const list = prepareNotes(must<Note[]>(notes));
  const urls = await signPhotoUrls(list.flatMap((n) => (n.photo ? [n.photo.storage_path] : [])));
  return { notes: list, projects, people, unread, urls };
}

// Client notes on photos and client messages, with replies, for admins and
// Bauleiter.
export function NotesSection({ locale, t }: { locale: Locale; t: Dictionary }) {
  const n = t.notes;
  const { data, error, reload } = useLoad(loadNotes);
  const [filter, setFilter] = useState<Filter>("open");
  const [projectId, setProjectId] = useState("");
  // ?note=<id> opens a note directly, e.g. from a later e-mail link.
  const [openId, setOpenId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("note"),
  );
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const date = new Intl.DateTimeFormat(dateLocale(locale), { dateStyle: "medium", timeStyle: "short" });

  const unread = new Set([...(data?.unread ?? [])].filter((id) => !seen.has(id)));
  const projectName = new Map(data?.projects.map((p) => [p.id, p.name]));
  const people = new Map<string, Person>(data?.people.map((p) => [p.id, p]));
  const shown = (data?.notes ?? []).filter(
    (x) =>
      (!projectId || x.project_id === projectId) &&
      (filter === "all" || (filter === "unread" ? unread.has(x.id) : x.status === filter)),
  );
  const opened = data?.notes.find((x) => x.id === openId);

  const onSeen = useCallback((id: string) => {
    setSeen((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
    markNoteRead(id);
  }, []);

  const filters: [Filter, string][] = [
    ["unread", `${n.filterUnread} (${unread.size})`],
    ["open", n.filterOpen],
    ["done", n.filterDone],
    ["all", n.filterAll],
  ];

  return (
    <div>
      <SectionHeader title={t.admin.sections.notes}>
        <Select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-56">
          <option value="">{n.allSites}</option>
          {data?.projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </SectionHeader>
      <ErrorNote error={error} />

      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-full border px-4 py-1.5 text-sm transition ${
              filter === key ? "border-gold bg-gold/15 text-gold" : "border-line text-silver-dim hover:border-gold/60"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <Panel>
        {!data ? null : !shown.length ? (
          <p className="text-center text-sm text-silver-dim">{n.noneHere}</p>
        ) : (
          <ul className="-my-2 divide-y divide-line">
            {shown.map((x) => {
              const url = x.photo ? data.urls.get(x.photo.storage_path) : undefined;
              const last = x.replies.at(-1);
              return (
                <li key={x.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(x.id)}
                    className="flex w-full items-start gap-3 py-3 text-left transition hover:bg-gold/5"
                  >
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- signed URL thumbnail
                      <img src={url} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-panel-2 text-amber-300">
                        <Mail size={22} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-1.5">
                        {unread.has(x.id) && <span className="h-2.5 w-2.5 rounded-full bg-gold" title={n.unread} />}
                        <KindBadge kind={x.kind} t={t} />
                        <StatusBadge status={x.status} t={t} />
                        <span className="text-sm text-white">{projectName.get(x.project_id) ?? "–"}</span>
                        <span className="text-xs text-silver-dim">· {personName(people.get(x.author_id ?? ""))}</span>
                        <span className="ml-auto text-xs text-silver-dim">{date.format(new Date(x.created_at))}</span>
                      </div>
                      <p className="line-clamp-2 text-sm text-silver">{x.body}</p>
                      {last && (
                        <p className="mt-1 line-clamp-1 text-xs text-silver-dim">
                          {n.replies.replace("{n}", String(x.replies.length))} ·{" "}
                          <span className={last.by_staff ? "text-gold" : "text-silver"}>{last.body}</span>
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {opened && data && (
        <NoteModal
          note={opened}
          notes={data.notes}
          url={opened.photo ? data.urls.get(opened.photo.storage_path) : undefined}
          title={projectName.get(opened.project_id) ?? ""}
          people={people}
          unread={unread}
          t={t}
          locale={locale}
          onSelect={setOpenId}
          onSeen={onSeen}
          onChanged={reload}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}

function NoteModal({
  note,
  notes,
  url,
  title,
  people,
  unread,
  t,
  locale,
  onSelect,
  onSeen,
  onChanged,
  onClose,
}: {
  note: Note;
  notes: Note[];
  url: string | undefined;
  title: string;
  people: Map<string, Person>;
  unread: Set<string>;
  t: Dictionary;
  locale: Locale;
  onSelect: (id: string) => void;
  onSeen: (id: string) => void;
  onChanged: () => void;
  onClose: () => void;
}) {
  const n = t.notes;
  const me = useUser();
  const [error, setError] = useState<string | null>(null);
  const pins = note.photo_id ? photoPins(notes, note.photo_id) : [];
  const isUnread = unread.has(note.id);

  useEffect(() => {
    if (isUnread) onSeen(note.id);
  }, [note.id, isUnread, onSeen]);

  async function setStatus(status: NoteStatus) {
    const { error: e } = await createClient().from("client_notes").update({ status }).eq("id", note.id);
    if (e) return setError(e.message);
    onChanged();
  }

  async function remove() {
    if (!confirm(n.confirmDelete)) return;
    const { error: e } = await createClient().from("client_notes").delete().eq("id", note.id);
    if (e) return setError(e.message);
    onClose();
    onChanged();
  }

  return (
    <Modal title={title} onClose={onClose} wide>
      {note.photo_id && (
        <div className="mb-5">
          {url ? (
            <PinnedPhoto url={url} pins={pins} activeId={note.id} onSelect={onSelect} />
          ) : (
            <p className="text-sm text-silver-dim">{n.photoGone}</p>
          )}
        </div>
      )}
      <ErrorNote error={error} />
      <NoteThread
        note={note}
        side="staff"
        t={t}
        locale={locale}
        number={pins.length ? pins.indexOf(note) + 1 : undefined}
        clientName={personName(people.get(note.author_id ?? ""))}
        staffName={(id) => personName(people.get(id ?? ""))}
        onChanged={onChanged}
        actions={
          <>
            {note.status === "open" ? (
              <Button variant="ghost" className="!px-3 !py-1.5" onClick={() => setStatus("done")}>
                <CheckCircle2 size={14} /> {n.markDone}
              </Button>
            ) : (
              <Button variant="ghost" className="!px-3 !py-1.5" onClick={() => setStatus("open")}>
                <RotateCcw size={14} /> {n.reopen}
              </Button>
            )}
            {me.roles.includes("admin") && (
              <IconButton danger onClick={remove} aria-label={n.delete} title={n.delete}>
                <Trash2 size={14} />
              </IconButton>
            )}
          </>
        }
      />
    </Modal>
  );
}
