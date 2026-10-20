"use client";

import { useEffect, useState, type ReactNode } from "react";
import { HelpCircle, Mail, MapPin, Send } from "lucide-react";
import { Button } from "@/components/button";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/auth";
import { dateLocale, type Dictionary, type Locale } from "@/i18n";
import { Badge, ErrorNote, Textarea, type Tone } from "@/app/[locale]/admin/kit";

// Client notes on photos, client messages and their reply threads, shared by
// the client page and the admin panel.

export type NoteKind = "note" | "question" | "message";
export type NoteStatus = "open" | "done";

export type Reply = { id: string; author_id: string | null; by_staff: boolean; body: string; created_at: string };

export type Note = {
  id: string;
  project_id: string;
  author_id: string | null;
  photo_id: string | null;
  pos_x: number | null;
  pos_y: number | null;
  kind: NoteKind;
  body: string;
  status: NoteStatus;
  created_at: string;
  replies: Reply[];
  photo: { storage_path: string } | null;
};

export const NOTE_SELECT =
  "id, project_id, author_id, photo_id, pos_x, pos_y, kind, body, status, created_at, " +
  "replies:client_note_replies(id, author_id, by_staff, body, created_at), photo:photos(storage_path)";

export const NOTIFICATIONS_EVENT = "qv:notifications";

// Oldest reply first; newest topic first.
export function prepareNotes(notes: Note[]) {
  return notes
    .map((n) => ({ ...n, replies: [...n.replies].sort((a, b) => a.created_at.localeCompare(b.created_at)) }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

// Markers of one photo in the order they were set, numbered from 1.
export function photoPins(notes: Note[], photoId: string) {
  return notes
    .filter((n) => n.photo_id === photoId && n.pos_x !== null && n.pos_y !== null)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function signPhotoUrls(paths: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(paths)];
  if (!unique.length) return new Map();
  const { data } = await createClient().storage.from("project-photos").createSignedUrls(unique, 60 * 60);
  return new Map((data ?? []).flatMap((s) => (s.path && s.signedUrl ? [[s.path, s.signedUrl] as const] : [])));
}

// Notes with notifications the current user has not opened yet.
export async function loadUnreadNoteIds(): Promise<Set<string>> {
  const { data } = await createClient().from("notifications").select("note_id").is("read_at", null);
  return new Set((data ?? []).map((r) => r.note_id as string).filter(Boolean));
}

export async function markNoteRead(noteId: string) {
  await createClient()
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("note_id", noteId)
    .is("read_at", null);
  window.dispatchEvent(new Event(NOTIFICATIONS_EVENT));
}

// Unread notifications of the current user; refreshed every minute, on focus
// and whenever a note is opened.
export function useUnreadCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const { count: n } = await createClient()
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .is("read_at", null);
      if (active) setCount(n ?? 0);
    };
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    window.addEventListener(NOTIFICATIONS_EVENT, refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener(NOTIFICATIONS_EVENT, refresh);
    };
  }, []);
  return count;
}

const KIND_TONES: Record<NoteKind, Tone> = { note: "olive", question: "sky", message: "amber" };
const KIND_ICONS: Record<NoteKind, typeof MapPin> = { note: MapPin, question: HelpCircle, message: Mail };

export function KindBadge({ kind, t }: { kind: NoteKind; t: Dictionary }) {
  const Icon = KIND_ICONS[kind];
  return (
    <Badge tone={KIND_TONES[kind]}>
      <span className="inline-flex items-center gap-1">
        <Icon size={12} /> {t.notes.kinds[kind]}
      </span>
    </Badge>
  );
}

export function StatusBadge({ status, t }: { status: NoteStatus; t: Dictionary }) {
  return <Badge tone={status === "done" ? "green" : "gray"}>{t.notes.status[status]}</Badge>;
}

function pinClass(n: Note, active: boolean) {
  const color =
    n.status === "done"
      ? "border-emerald-300 bg-emerald-700 text-white"
      : n.kind === "question"
        ? "border-sky-200 bg-sky-600 text-white"
        : "border-gold bg-olive text-ink";
  return `${color} ${active ? "scale-125 ring-4 ring-white/60" : ""}`;
}

// Photo with numbered markers. With onPick, a tap on the photo returns the
// spot (0..1 from the top left) for a new marker.
export function PinnedPhoto({
  url,
  pins,
  activeId,
  draft,
  onPick,
  onSelect,
}: {
  url: string | undefined;
  pins: Note[];
  activeId?: string | null;
  draft?: { x: number; y: number } | null;
  onPick?: (x: number, y: number) => void;
  onSelect?: (id: string) => void;
}) {
  if (!url) return <div className="aspect-video w-full rounded-xl bg-panel-2" />;
  return (
    <div className="relative mx-auto w-fit max-w-full touch-manipulation">
      {/* eslint-disable-next-line @next/next/no-img-element -- markers need the real image box */}
      <img
        src={url}
        alt=""
        draggable={false}
        className={`block max-h-[60vh] max-w-full select-none rounded-xl ${onPick ? "cursor-crosshair" : ""}`}
        onClick={(e) => {
          if (!onPick) return;
          const r = e.currentTarget.getBoundingClientRect();
          const clamp = (v: number) => Math.min(1, Math.max(0, v));
          onPick(clamp((e.clientX - r.left) / r.width), clamp((e.clientY - r.top) / r.height));
        }}
      />
      {pins.map((n, i) => (
        <button
          key={n.id}
          type="button"
          onClick={() => onSelect?.(n.id)}
          style={{ left: `${(n.pos_x ?? 0) * 100}%`, top: `${(n.pos_y ?? 0) * 100}%` }}
          className={`absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-xs font-bold shadow-[0_2px_8px_rgba(0,0,0,0.6)] transition ${pinClass(n, n.id === activeId)}`}
        >
          {i + 1}
        </button>
      ))}
      {draft && (
        <span
          style={{ left: `${draft.x * 100}%`, top: `${draft.y * 100}%` }}
          className="pointer-events-none absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 animate-pulse items-center justify-center rounded-full border-2 border-white bg-gold text-sm font-bold text-ink shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
        >
          +
        </span>
      )}
    </div>
  );
}

// One topic with its replies and a reply box. `side` decides which bubbles
// are "mine" and how the other side is named.
export function NoteThread({
  note,
  side,
  t,
  locale,
  staffName,
  clientName,
  number,
  actions,
  onChanged,
}: {
  note: Note;
  side: "client" | "staff";
  t: Dictionary;
  locale: Locale;
  staffName?: (id: string | null) => string;
  clientName?: string;
  number?: number;
  actions?: ReactNode;
  onChanged: () => void;
}) {
  const n = t.notes;
  const me = useUser();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const date = new Intl.DateTimeFormat(dateLocale(locale), { dateStyle: "medium", timeStyle: "short" });

  const clientLabel = (authorId: string | null) =>
    side === "client" && authorId === me.id ? n.you : clientName || t.roles.client;
  const staffLabel = (authorId: string | null) =>
    side === "staff" ? (authorId === me.id ? n.you : staffName?.(authorId) ?? n.firm) : n.firm;

  async function send() {
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    setError(null);
    const { error: e } = await createClient().from("client_note_replies").insert({ note_id: note.id, body });
    setBusy(false);
    if (e) return setError(e.message);
    setText("");
    onChanged();
  }

  const bubble = (who: string, body: string, at: string, mine: boolean, staff: boolean) => (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl border px-4 py-2.5 ${
          staff ? "border-gold/40 bg-gold/10" : "border-line bg-panel-2"
        } ${mine ? "rounded-br-md" : "rounded-bl-md"}`}
      >
        <div className="mb-1 flex flex-wrap items-baseline gap-x-2 text-[11px]">
          <span className={staff ? "font-medium text-gold" : "font-medium text-silver"}>{who}</span>
          <span className="text-silver-dim">{date.format(new Date(at))}</span>
        </div>
        <p className="whitespace-pre-wrap break-words text-sm text-white">{body}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {number !== undefined && (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-olive text-xs font-bold text-ink">
            {number}
          </span>
        )}
        <KindBadge kind={note.kind} t={t} />
        <StatusBadge status={note.status} t={t} />
        <div className="ml-auto flex flex-wrap gap-2">{actions}</div>
      </div>

      {bubble(clientLabel(note.author_id), note.body, note.created_at, side === "client", false)}
      {note.replies.map((r) => (
        <div key={r.id}>
          {bubble(
            r.by_staff ? staffLabel(r.author_id) : clientLabel(r.author_id),
            r.body,
            r.created_at,
            side === "staff" ? r.by_staff : !r.by_staff,
            r.by_staff,
          )}
        </div>
      ))}

      <ErrorNote error={error} />
      <div className="flex items-end gap-2">
        <Textarea
          rows={2}
          value={text}
          placeholder={n.replyPlaceholder}
          onChange={(e) => setText(e.target.value)}
          maxLength={4000}
        />
        <Button onClick={send} disabled={busy || !text.trim()} aria-label={n.send} className="shrink-0 !px-4">
          <Send size={16} />
        </Button>
      </div>
    </div>
  );
}
