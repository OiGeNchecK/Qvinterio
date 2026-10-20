"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { MapPin, PenLine } from "lucide-react";
import { Button } from "@/components/button";
import { Card, ProgressBar } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/auth";
import { dateLocale, type Dictionary, type Locale } from "@/i18n";
import {
  NOTE_SELECT,
  loadUnreadNoteIds,
  markNoteRead,
  prepareNotes,
  type Note,
} from "@/components/site-notes";
import { formatDateRange } from "../admin/data";
import { MessageModal, NotesList, PhotoNotesModal, ThreadModal, type ClientPhoto } from "./photo-notes";

type Stage = {
  id: string;
  title: string;
  status: "pending" | "in_progress" | "done";
  started_at: string | null;
  finished_at: string | null;
};

type Photo = ClientPhoto;

type Site = {
  projectId: string;
  expiresAt: string;
  project: { name: string; address: string | null; progress: number } | null;
  stages: Stage[];
  photos: Photo[];
};

async function loadSite(userId: string): Promise<Site | null> {
  const supabase = createClient();

  // Only grants that are still valid; RLS hides the site once access expires.
  const { data: access } = await supabase
    .from("client_access")
    .select("project_id, expires_at")
    .eq("client_id", userId)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!access) return null;

  const [{ data: project }, { data: stages }, { data: photos }] = await Promise.all([
    supabase.from("projects").select("name, address, progress").eq("id", access.project_id).single(),
    supabase
      .from("project_stages")
      .select("id, title, status, started_at, finished_at")
      .eq("project_id", access.project_id)
      .order("position"),
    supabase
      .from("photos")
      .select("id, storage_path, caption, taken_at")
      .eq("project_id", access.project_id)
      .order("taken_at", { ascending: false })
      .limit(60),
  ]);

  const signed = photos?.length
    ? ((
        await supabase.storage
          .from("project-photos")
          .createSignedUrls(photos.map((p) => p.storage_path), 60 * 60)
      ).data ?? [])
    : [];
  const urlByPath = new Map(signed.map((s) => [s.path, s.signedUrl]));

  return {
    projectId: access.project_id,
    expiresAt: access.expires_at,
    project,
    stages: (stages ?? []) as Stage[],
    photos: (photos ?? []).map((p) => ({ ...p, url: urlByPath.get(p.storage_path) ?? undefined })),
  };
}

async function loadNotes(projectId: string) {
  const [{ data }, unread] = await Promise.all([
    createClient()
      .from("client_notes")
      .select(NOTE_SELECT)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .overrideTypes<Note[], { merge: false }>(),
    loadUnreadNoteIds(),
  ]);
  return { notes: prepareNotes(data ?? []), unread };
}

export function ClientHome({ locale, t }: { locale: Locale; t: Dictionary }) {
  const user = useUser();
  const [site, setSite] = useState<Site | null | undefined>(undefined);
  const [notes, setNotes] = useState<Note[]>([]);
  const [unread, setUnread] = useState<Set<string>>(new Set());
  const [openPhoto, setOpenPhoto] = useState<{ photo: Photo; noteId?: string } | null>(null);
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const [sent, setSent] = useState(false);
  const projectId = site?.projectId;

  useEffect(() => {
    loadSite(user.id).then(setSite);
  }, [user.id]);

  const reloadNotes = useCallback(() => {
    if (!projectId) return;
    loadNotes(projectId).then((r) => {
      setNotes(r.notes);
      setUnread(r.unread);
    });
  }, [projectId]);
  useEffect(reloadNotes, [reloadNotes]);

  const onSeen = useCallback(
    (id: string) => {
      if (!unread.has(id)) return;
      markNoteRead(id);
      setUnread((prev) => new Set([...prev].filter((x) => x !== id)));
    },
    [unread],
  );

  if (site === undefined) return null;
  if (site === null) {
    return (
      <Card>
        <p className="text-silver-dim">{t.client.noAccess}</p>
      </Card>
    );
  }

  const dateFormat = new Intl.DateTimeFormat(dateLocale(locale), { dateStyle: "medium" });
  const progress = site.project?.progress ?? 0;
  const photoById = new Map(site.photos.map((p) => [p.id, p]));
  const pinCount = (photoId: string) => notes.filter((n) => n.photo_id === photoId).length;
  const openNote = notes.find((n) => n.id === openNoteId);

  function open(note: Note) {
    const photo = note.photo_id ? photoById.get(note.photo_id) : undefined;
    if (photo) setOpenPhoto({ photo, noteId: note.id });
    else setOpenNoteId(note.id);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-white">{site.project?.name}</h1>
        {site.project?.address && <p className="mt-1 text-silver-dim">{site.project.address}</p>}
        <p className="mt-1 text-xs text-silver-dim">
          {t.client.validUntil} {dateFormat.format(new Date(site.expiresAt))}
        </p>
      </div>

      <Card className="space-y-3">
        <div className="flex justify-between text-sm">
          <span>{t.common.progress}</span>
          <span className="text-olive">{progress}%</span>
        </div>
        <ProgressBar value={progress} />
      </Card>

      <section>
        <h2 className="mb-4 font-medium text-white">{t.client.stages}</h2>
        <ol className="space-y-2">
          {site.stages.map((s) => (
            <li key={s.id} className="flex items-center gap-4 rounded-xl border border-line bg-panel/70 px-4 py-3">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                  s.status === "done" ? "bg-olive-light" : s.status === "in_progress" ? "bg-gold" : "bg-line"
                }`}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-white">{s.title}</span>
                {(s.started_at || s.finished_at) && (
                  <span className="block text-xs text-silver-dim">{formatDateRange(s.started_at, s.finished_at, locale)}</span>
                )}
              </span>
              <span className="text-xs text-silver-dim">{t.stageStatus[s.status]}</span>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="mb-1 font-medium text-white">{t.client.photos}</h2>
        {site.photos.length > 0 && <p className="mb-4 text-sm text-silver-dim">{t.notes.gridHint}</p>}
        {!site.photos.length ? (
          <p className="text-sm text-silver-dim">{t.client.noPhotos}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {site.photos.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setOpenPhoto({ photo: p })}
                className="overflow-hidden rounded-xl border border-line bg-panel text-left transition hover:border-gold/60"
              >
                <div className="relative aspect-square bg-panel-2">
                  {p.url && <Image src={p.url} alt={p.caption ?? ""} fill sizes="25vw" className="object-cover" />}
                  {pinCount(p.id) > 0 && (
                    <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-ink/80 px-2 py-0.5 text-xs text-gold">
                      <MapPin size={12} /> {pinCount(p.id)}
                    </span>
                  )}
                </div>
                <div className="px-3 py-2 text-xs text-silver-dim">
                  {dateFormat.format(new Date(p.taken_at))}
                  {p.caption ? ` · ${p.caption}` : ""}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-medium text-white">{t.notes.listTitle}</h2>
          <Button onClick={() => (setSent(false), setWriting(true))}>
            <PenLine size={16} /> {t.notes.writeMessage}
          </Button>
        </div>
        {sent && (
          <p className="mb-3 rounded-lg border border-olive/60 bg-olive/15 px-3 py-2 text-sm text-olive-light">
            {t.notes.sentHint}
          </p>
        )}
        <NotesList notes={notes} photos={photoById} unread={unread} t={t} locale={locale} onOpen={open} />
      </section>

      {openPhoto && (
        <PhotoNotesModal
          photo={openPhoto.photo}
          projectId={site.projectId}
          notes={notes}
          initialNoteId={openPhoto.noteId}
          unread={unread}
          t={t}
          locale={locale}
          onChanged={reloadNotes}
          onSeen={onSeen}
          onClose={() => setOpenPhoto(null)}
        />
      )}
      {openNote && (
        <ThreadModal
          note={openNote}
          t={t}
          locale={locale}
          onChanged={reloadNotes}
          onSeen={onSeen}
          onClose={() => setOpenNoteId(null)}
        />
      )}
      {writing && (
        <MessageModal
          projectId={site.projectId}
          t={t}
          onClose={() => setWriting(false)}
          onSent={() => {
            setWriting(false);
            setSent(true);
            reloadNotes();
          }}
        />
      )}
    </div>
  );
}
