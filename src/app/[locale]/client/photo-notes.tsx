"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/button";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/auth";
import { dateLocale, type Dictionary, type Locale } from "@/i18n";
import { ErrorNote, IconButton, Modal, ModalActions, Textarea } from "../admin/kit";
import {
  KindBadge,
  NoteThread,
  PinnedPhoto,
  StatusBadge,
  photoPins,
  type Note,
  type NoteKind,
} from "@/components/site-notes";

export type ClientPhoto = { id: string; caption: string | null; taken_at: string; url?: string };

type Common = { t: Dictionary; locale: Locale; onChanged: () => void; onSeen: (id: string) => void };

// The author may take back a note nobody has answered yet.
function DeleteOwn({ note, t, onDone }: { note: Note; t: Dictionary; onDone: () => void }) {
  const me = useUser();
  if (note.author_id !== me.id || note.replies.length) return null;
  return (
    <IconButton
      danger
      aria-label={t.notes.delete}
      title={t.notes.delete}
      onClick={async () => {
        if (!confirm(t.notes.confirmDelete)) return;
        await createClient().from("client_notes").delete().eq("id", note.id);
        onDone();
      }}
    >
      <Trash2 size={14} />
    </IconButton>
  );
}

// Big photo: tap a spot to leave a note or a question, tap a marker to read
// and answer.
export function PhotoNotesModal({
  photo,
  projectId,
  notes,
  initialNoteId,
  unread,
  t,
  locale,
  onChanged,
  onSeen,
  onClose,
}: Common & {
  photo: ClientPhoto;
  projectId: string;
  notes: Note[];
  initialNoteId?: string | null;
  unread: Set<string>;
  onClose: () => void;
}) {
  const n = t.notes;
  const pins = photoPins(notes, photo.id);
  const [activeId, setActiveId] = useState<string | null>(initialNoteId ?? null);
  const [draft, setDraft] = useState<{ x: number; y: number } | null>(null);
  const [kind, setKind] = useState<Exclude<NoteKind, "message">>("note");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = pins.find((p) => p.id === activeId) ?? null;
  const date = new Intl.DateTimeFormat(dateLocale(locale), { dateStyle: "medium" });

  useEffect(() => {
    if (activeId && unread.has(activeId)) onSeen(activeId);
  }, [activeId, unread, onSeen]);

  async function save() {
    if (!draft || !body.trim()) return;
    setBusy(true);
    setError(null);
    const { data, error: e } = await createClient()
      .from("client_notes")
      .insert({ project_id: projectId, photo_id: photo.id, pos_x: draft.x, pos_y: draft.y, kind, body: body.trim() })
      .select("id")
      .single();
    setBusy(false);
    if (e) return setError(e.message);
    setDraft(null);
    setBody("");
    setActiveId(data.id);
    onChanged();
  }

  return (
    <Modal title={photo.caption || date.format(new Date(photo.taken_at))} onClose={onClose} wide>
      <p className="mb-3 text-sm text-silver-dim">{n.photoHint}</p>
      <PinnedPhoto
        url={photo.url}
        pins={pins}
        activeId={activeId}
        draft={draft}
        onPick={(x, y) => {
          setDraft({ x, y });
          setActiveId(null);
        }}
        onSelect={(id) => {
          setDraft(null);
          setActiveId(id);
        }}
      />

      <div className="mt-5">
        {draft ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              {(["note", "question"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={`flex-1 rounded-xl border px-3 py-2.5 text-sm transition ${
                    kind === k ? "border-gold bg-gold/15 text-gold" : "border-line text-silver-dim hover:border-gold/60"
                  }`}
                >
                  {n.kinds[k]}
                </button>
              ))}
            </div>
            <Textarea
              autoFocus
              value={body}
              maxLength={4000}
              placeholder={kind === "question" ? n.placeholderQuestion : n.placeholderNote}
              onChange={(e) => setBody(e.target.value)}
            />
            <ErrorNote error={error} />
            <ModalActions>
              <Button variant="ghost" onClick={() => setDraft(null)}>
                {n.cancel}
              </Button>
              <Button onClick={save} disabled={busy || !body.trim()}>
                {n.save}
              </Button>
            </ModalActions>
          </div>
        ) : active ? (
          <NoteThread
            note={active}
            side="client"
            t={t}
            locale={locale}
            number={pins.indexOf(active) + 1}
            onChanged={onChanged}
            actions={
              <DeleteOwn
                note={active}
                t={t}
                onDone={() => {
                  setActiveId(null);
                  onChanged();
                }}
              />
            }
          />
        ) : pins.length ? (
          <div>
            <h4 className="mb-2 text-xs uppercase tracking-wider text-gold">{n.onThisPhoto}</h4>
            <ul className="space-y-2">
              {pins.map((p, i) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(p.id)}
                    className="flex w-full items-center gap-3 rounded-xl border border-line bg-panel-2 px-3 py-2.5 text-left transition hover:border-gold/60"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-olive text-xs font-bold text-ink">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-white">{p.body}</span>
                    {unread.has(p.id) && <span className="h-2 w-2 shrink-0 rounded-full bg-gold" />}
                    {p.replies.length > 0 && (
                      <span className="shrink-0 text-xs text-silver-dim">
                        {n.replies.replace("{n}", String(p.replies.length))}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

export function MessageModal({
  projectId,
  t,
  onSent,
  onClose,
}: {
  projectId: string;
  t: Dictionary;
  onSent: () => void;
  onClose: () => void;
}) {
  const n = t.notes;
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setError(null);
    const { error: e } = await createClient()
      .from("client_notes")
      .insert({ project_id: projectId, kind: "message", body: body.trim() });
    setBusy(false);
    if (e) return setError(e.message);
    onSent();
  }

  return (
    <Modal title={n.messageTitle} onClose={onClose}>
      <Textarea
        autoFocus
        rows={6}
        value={body}
        maxLength={4000}
        placeholder={n.placeholderMessage}
        onChange={(e) => setBody(e.target.value)}
      />
      <ErrorNote error={error} />
      <ModalActions>
        <Button variant="ghost" onClick={onClose}>
          {n.cancel}
        </Button>
        <Button onClick={send} disabled={busy || !body.trim()}>
          {n.send}
        </Button>
      </ModalActions>
    </Modal>
  );
}

export function ThreadModal({ note, t, locale, onChanged, onSeen, onClose }: Common & { note: Note; onClose: () => void }) {
  useEffect(() => {
    onSeen(note.id);
  }, [note.id, onSeen]);
  return (
    <Modal title={t.notes.kinds[note.kind]} onClose={onClose}>
      <NoteThread
        note={note}
        side="client"
        t={t}
        locale={locale}
        onChanged={onChanged}
        actions={
          <DeleteOwn
            note={note}
            t={t}
            onDone={() => {
              onClose();
              onChanged();
            }}
          />
        }
      />
    </Modal>
  );
}

// All notes and messages of the site, newest first.
export function NotesList({
  notes,
  photos,
  unread,
  t,
  locale,
  onOpen,
}: {
  notes: Note[];
  photos: Map<string, ClientPhoto>;
  unread: Set<string>;
  t: Dictionary;
  locale: Locale;
  onOpen: (note: Note) => void;
}) {
  const n = t.notes;
  const date = new Intl.DateTimeFormat(dateLocale(locale), { dateStyle: "medium" });
  if (!notes.length) return <p className="text-sm text-silver-dim">{n.empty}</p>;
  return (
    <ul className="space-y-2">
      {notes.map((note) => {
        const photo = note.photo_id ? photos.get(note.photo_id) : undefined;
        const lastStaff = [...note.replies].reverse().find((r) => r.by_staff);
        return (
          <li key={note.id}>
            <button
              type="button"
              onClick={() => onOpen(note)}
              className={`flex w-full items-start gap-3 rounded-xl border bg-panel/70 p-3 text-left transition hover:border-gold/60 ${
                unread.has(note.id) ? "border-gold/70" : "border-line"
              }`}
            >
              {photo?.url ? (
                // eslint-disable-next-line @next/next/no-img-element -- signed URL thumbnail
                <img src={photo.url} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
              ) : null}
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  <KindBadge kind={note.kind} t={t} />
                  <StatusBadge status={note.status} t={t} />
                  {unread.has(note.id) && (
                    <span className="rounded-md bg-gold px-2 py-0.5 text-[11px] font-semibold text-ink">{n.newReply}</span>
                  )}
                  <span className="ml-auto text-xs text-silver-dim">{date.format(new Date(note.created_at))}</span>
                </div>
                <p className="line-clamp-2 text-sm text-white">{note.body}</p>
                {lastStaff && (
                  <p className="mt-1 line-clamp-1 text-xs text-gold">
                    {n.firm}: {lastStaff.body}
                  </p>
                )}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
