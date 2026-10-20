"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Camera, ChevronLeft, ChevronRight, Download, ExternalLink, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/button";
import { createClient } from "@/lib/supabase/client";
import { dateLocale, type Dictionary, type Locale } from "@/i18n";
import { Badge, ErrorNote, Field, IconButton, Input, Modal, ModalActions, Panel, SectionHeader, Select, emptyToNull, must, useLoad } from "../kit";
import { loadPeople, loadProjectRefs, personName, type ProjectRef } from "../data";
import { shrink } from "../upload";

const BUCKET = "project-photos";
const PAGE = 120;

export type SitePhoto = {
  id: string;
  project_id: string;
  author_id: string | null;
  stage_id: string | null;
  storage_path: string;
  caption: string | null;
  visible_to_client: boolean;
  taken_at: string;
  created_at: string;
  project: { name: string } | null;
  stage: { title: string } | null;
  author: { full_name: string; email: string | null } | null;
  url?: string;
};

type Filter = { project: string; author: string; visibility: "" | "client" | "internal"; order: "newest" | "oldest" };

// Sorted by upload date, with a signed URL for each file (the bucket is private).
export async function loadSitePhotos(filter: Partial<Filter>, limit: number) {
  const supabase = createClient();
  let query = supabase
    .from("photos")
    .select(
      "id, project_id, author_id, stage_id, storage_path, caption, visible_to_client, taken_at, created_at, project:projects(name), stage:project_stages(title), author:profiles(full_name, email)",
    )
    .order("created_at", { ascending: filter.order === "oldest" })
    .limit(limit);
  if (filter.project) query = query.eq("project_id", filter.project);
  if (filter.author) query = query.eq("author_id", filter.author);
  if (filter.visibility) query = query.eq("visible_to_client", filter.visibility === "client");
  const list = must(await query.overrideTypes<SitePhoto[], { merge: false }>());
  const signed = list.length
    ? ((await supabase.storage.from(BUCKET).createSignedUrls(list.map((p) => p.storage_path), 60 * 60)).data ?? [])
    : [];
  const urlByPath = new Map(signed.map((s) => [s.path, s.signedUrl]));
  return list.map((p) => ({ ...p, url: urlByPath.get(p.storage_path) ?? undefined }));
}

// Site photos for admins and the Bauleitung, grouped by upload day.
export function PhotosSection({ locale, t }: { locale: Locale; t: Dictionary }) {
  const k = t.sitePhotos;
  const a = t.adminUi;
  // Links from the site list arrive as ?project=<id>. The guard in the admin
  // layout renders this only in the browser, so window is available.
  const [filter, setFilter] = useState<Filter>(() => ({
    project: new URLSearchParams(window.location.search).get("project") ?? "",
    author: "",
    visibility: "",
    order: "newest",
  }));
  const [limit, setLimit] = useState(PAGE);
  const refs = useLoad(async () => {
    const [projects, people] = await Promise.all([loadProjectRefs(), loadPeople()]);
    return { projects, people };
  });
  const { data, error, reload } = useLoad(() => loadSitePhotos(filter, limit));
  const [actionError, setActionError] = useState<string | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<SitePhoto | null>(null);

  function change(next: Partial<Filter>) {
    setFilter({ ...filter, ...next });
    setLimit(PAGE);
    reload();
  }

  async function run(action: () => PromiseLike<string | null>) {
    setActionError(await action());
    reload();
  }

  const toggle = (p: SitePhoto) =>
    run(async () => {
      const { error } = await createClient().from("photos").update({ visible_to_client: !p.visible_to_client }).eq("id", p.id);
      return error?.message ?? null;
    });

  const remove = (p: SitePhoto) => {
    if (!window.confirm(k.confirmDelete)) return;
    setOpenIndex(null);
    run(async () => {
      const supabase = createClient();
      const { error } = await supabase.from("photos").delete().eq("id", p.id);
      if (!error) await supabase.storage.from(BUCKET).remove([p.storage_path]);
      return error?.message ?? null;
    });
  };

  const photos = data ?? [];
  const day = new Intl.DateTimeFormat(dateLocale(locale), { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const time = new Intl.DateTimeFormat(dateLocale(locale), { timeStyle: "short" });
  const days: { key: string; label: string; items: { photo: SitePhoto; index: number }[] }[] = [];
  photos.forEach((photo, index) => {
    const d = new Date(photo.created_at);
    const key = d.toDateString();
    if (days.at(-1)?.key !== key) days.push({ key, label: day.format(d), items: [] });
    days.at(-1)!.items.push({ photo, index });
  });
  // Uploaders: everybody except clients.
  const uploaders = (refs.data?.people ?? []).filter((p) => !(p.roles.length === 1 && p.roles[0] === "client"));
  const opened = openIndex === null ? null : photos[openIndex];

  return (
    <div>
      <SectionHeader title={t.admin.sections.photos}>
        <Select value={filter.project} onChange={(e) => change({ project: e.target.value })} className="w-auto">
          <option value="">{a.allProjects}</option>
          {refs.data?.projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        <Select value={filter.author} onChange={(e) => change({ author: e.target.value })} className="w-auto">
          <option value="">{k.allPeople}</option>
          {uploaders.map((p) => (
            <option key={p.id} value={p.id}>
              {personName(p)}
            </option>
          ))}
        </Select>
        <Select
          value={filter.visibility}
          onChange={(e) => change({ visibility: e.target.value as Filter["visibility"] })}
          className="w-auto"
        >
          <option value="">{k.allVisibility}</option>
          <option value="client">{k.forClient}</option>
          <option value="internal">{k.internalOnly}</option>
        </Select>
        <Select value={filter.order} onChange={(e) => change({ order: e.target.value as Filter["order"] })} className="w-auto">
          <option value="newest">{k.newestFirst}</option>
          <option value="oldest">{k.oldestFirst}</option>
        </Select>
        <Button onClick={() => setUploading(true)}>
          <Camera size={16} /> {k.upload}
        </Button>
      </SectionHeader>
      <p className="-mt-3 mb-5 text-sm text-silver-dim">{k.hint}</p>
      <ErrorNote error={error ?? refs.error ?? actionError} />

      {data && !photos.length && (
        <Panel>
          <p className="text-center text-sm text-silver-dim">{k.none}</p>
        </Panel>
      )}

      <div className="space-y-6">
        {days.map((d) => (
          <section key={d.key}>
            <h3 className="mb-3 flex items-baseline justify-between gap-3 border-b border-line pb-2">
              <span className="font-display text-lg capitalize text-gold">{d.label}</span>
              <span className="text-xs text-silver-dim">{k.count.replace("{n}", String(d.items.length))}</span>
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {d.items.map(({ photo: p, index }) => (
                <figure key={p.id} className="overflow-hidden rounded-xl border border-line bg-panel">
                  <button
                    onClick={() => setOpenIndex(index)}
                    className="relative block aspect-square w-full bg-panel-2"
                    aria-label={p.caption ?? p.project?.name ?? ""}
                  >
                    {p.url && (
                      <Image
                        src={p.url}
                        alt={p.caption ?? ""}
                        fill
                        sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                        className="object-cover"
                      />
                    )}
                    <span className="absolute left-2 top-2">
                      <Badge tone={p.visible_to_client ? "green" : "gray"}>
                        {p.visible_to_client ? k.forClient : k.internalOnly}
                      </Badge>
                    </span>
                  </button>
                  <figcaption className="space-y-1 px-3 py-2 text-xs text-silver-dim">
                    {!filter.project && <div className="truncate font-medium text-silver">{p.project?.name}</div>}
                    <div className="truncate">
                      {time.format(new Date(p.created_at))} · {personName(p.author)}
                    </div>
                    {p.stage && <div className="truncate">{p.stage.title}</div>}
                    {p.caption && <div className="line-clamp-2 text-silver">{p.caption}</div>}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        ))}
      </div>

      {photos.length >= limit && (
        <div className="mt-6 flex justify-center">
          <Button
            variant="ghost"
            onClick={() => {
              setLimit(limit + PAGE);
              reload();
            }}
          >
            {k.more}
          </Button>
        </div>
      )}

      {uploading && refs.data && (
        <UploadModal
          projects={refs.data.projects}
          projectId={filter.project}
          t={t}
          onClose={() => setUploading(false)}
          onUploaded={(projectId) => {
            setUploading(false);
            change({ project: projectId, author: "", visibility: "", order: "newest" });
          }}
        />
      )}

      {opened && openIndex !== null && (
        <PhotoViewer
          photo={opened}
          locale={locale}
          t={t}
          onClose={() => setOpenIndex(null)}
          onPrev={openIndex > 0 ? () => setOpenIndex(openIndex - 1) : undefined}
          onNext={openIndex < photos.length - 1 ? () => setOpenIndex(openIndex + 1) : undefined}
          onToggle={() => toggle(opened)}
          paused={!!editing}
          onEdit={() => setEditing(opened)}
          onDownload={() => run(() => downloadPhoto(opened, opened.project?.name).then(() => null, (e: Error) => e.message))}
          onDelete={() => remove(opened)}
        />
      )}
      {editing && refs.data && (
        <EditPhotoModal
          photo={editing}
          projects={refs.data.projects}
          t={t}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

export type PhotoForm = { project_id: string; stage_id: string; caption: string; visible_to_client: boolean };

// Site (when the list of sites is given), stage, caption and client visibility.
export function PhotoFields({
  form,
  setForm,
  projects,
  t,
}: {
  form: PhotoForm;
  setForm: (form: PhotoForm) => void;
  projects?: ProjectRef[];
  t: Dictionary;
}) {
  const w = t.worker;
  const [loadedStages, setStages] = useState<{ projectId: string; list: { id: string; title: string }[] }>({ projectId: "", list: [] });
  const stages = loadedStages.projectId === form.project_id ? loadedStages.list : [];

  useEffect(() => {
    const projectId = form.project_id;
    if (!projectId) return;
    let active = true;
    createClient()
      .from("project_stages")
      .select("id, title")
      .eq("project_id", projectId)
      .order("position")
      .then(({ data }) => active && setStages({ projectId, list: data ?? [] }));
    return () => {
      active = false;
    };
  }, [form.project_id]);

  return (
    <div className="space-y-3">
      {projects && (
        <Field label={t.adminUi.site}>
          <Select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value, stage_id: "" })}>
            <option value="">—</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      {!!stages.length && (
        <Field label={w.stage}>
          <Select value={form.stage_id} onChange={(e) => setForm({ ...form, stage_id: e.target.value })}>
            <option value="">—</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label={w.caption}>
        <Input value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} />
      </Field>
      <label className="flex items-center gap-2 text-sm text-silver">
        <input
          type="checkbox"
          checked={form.visible_to_client}
          onChange={(e) => setForm({ ...form, visible_to_client: e.target.checked })}
          className="accent-[var(--color-gold)]"
        />
        {w.visibleToClient}
      </label>
    </div>
  );
}

// Admins and the Bauleitung add photos to a site themselves.
function UploadModal({
  projects,
  projectId,
  t,
  onClose,
  onUploaded,
}: {
  projects: ProjectRef[];
  projectId: string;
  t: Dictionary;
  onClose: () => void;
  onUploaded: (projectId: string) => void;
}) {
  const k = t.sitePhotos;
  const w = t.worker;
  const [form, setForm] = useState<PhotoForm>({ project_id: projectId, stage_id: "", caption: "", visible_to_client: true });
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: File[]) {
    if (!files.length) return;
    if (!form.project_id) return setError(k.chooseSite);
    const supabase = createClient();
    setError(null);
    setProgress({ done: 0, total: files.length });
    try {
      for (const [i, file] of files.entries()) {
        const blob = await shrink(file);
        const ext = blob.type === "image/jpeg" ? "jpg" : (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
        const path = `${form.project_id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: blob.type || file.type });
        if (error) throw new Error(error.message);
        const inserted = await supabase.from("photos").insert({
          project_id: form.project_id,
          storage_path: path,
          stage_id: form.stage_id || null,
          caption: emptyToNull(form.caption),
          visible_to_client: form.visible_to_client,
        });
        if (inserted.error) {
          await supabase.storage.from(BUCKET).remove([path]);
          throw new Error(inserted.error.message);
        }
        setProgress({ done: i + 1, total: files.length });
      }
      onUploaded(form.project_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setProgress(null);
    }
  }

  return (
    <Modal title={k.upload} onClose={onClose}>
      <PhotoFields form={form} setForm={setForm} projects={projects} t={t} />
      <ErrorNote error={error} />
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <label
          className={`inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-b from-olive-light to-olive px-5 py-3 text-sm font-medium text-ink transition hover:brightness-110 sm:w-auto sm:py-2.5 ${
            progress || !form.project_id ? "pointer-events-none opacity-50" : ""
          }`}
        >
          <Camera size={16} /> {k.chooseFiles}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={!!progress || !form.project_id}
            onChange={(e) => {
              upload(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
        </label>
        {progress && (
          <span className="text-sm text-silver-dim">
            {w.uploading.replace("{done}", String(progress.done)).replace("{total}", String(progress.total))}
          </span>
        )}
      </div>
    </Modal>
  );
}

type EditablePhoto = { id: string; project_id: string; stage_id: string | null; caption: string | null; visible_to_client: boolean };

// Changes a photo after upload. The site can only be changed where a list of sites is given.
export function EditPhotoModal({
  photo,
  projects,
  t,
  onClose,
  onSaved,
}: {
  photo: EditablePhoto;
  projects?: ProjectRef[];
  t: Dictionary;
  onClose: () => void;
  onSaved: () => void;
}) {
  const a = t.adminUi;
  const [form, setForm] = useState<PhotoForm>({
    project_id: photo.project_id,
    stage_id: photo.stage_id ?? "",
    caption: photo.caption ?? "",
    visible_to_client: photo.visible_to_client,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!form.project_id) return setError(t.sitePhotos.chooseSite);
    setSaving(true);
    const { error } = await createClient()
      .from("photos")
      .update({
        ...(projects ? { project_id: form.project_id } : {}),
        stage_id: form.stage_id || null,
        caption: emptyToNull(form.caption),
        visible_to_client: form.visible_to_client,
      })
      .eq("id", photo.id);
    setSaving(false);
    if (error) return setError(error.message);
    onSaved();
  }

  return (
    <Modal title={t.sitePhotos.edit} onClose={onClose}>
      <PhotoFields form={form} setForm={setForm} projects={projects} t={t} />
      <ErrorNote error={error} />
      <ModalActions>
        <Button variant="ghost" onClick={onClose}>
          {a.cancel}
        </Button>
        <Button onClick={save} disabled={saving}>
          {a.save}
        </Button>
      </ModalActions>
    </Modal>
  );
}

// Saves the file under a readable name: site_2026-10-20_1530.jpg
export async function downloadPhoto(photo: { storage_path: string; created_at: string }, siteName?: string) {
  const { data, error } = await createClient().storage.from(BUCKET).download(photo.storage_path);
  if (error || !data) throw new Error(error?.message ?? "Download failed");
  const ext = photo.storage_path.split(".").pop() || "jpg";
  const d = new Date(photo.created_at);
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
  const site = (siteName ?? "foto").normalize("NFKD").replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "") || "foto";
  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${site}_${stamp}.${ext}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// Full-screen view with arrows (also on the keyboard) and the photo details.
function PhotoViewer({
  photo: p,
  locale,
  t,
  onClose,
  onPrev,
  onNext,
  paused,
  onToggle,
  onEdit,
  onDownload,
  onDelete,
}: {
  photo: SitePhoto;
  locale: Locale;
  t: Dictionary;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  paused: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const k = t.sitePhotos;
  const when = new Intl.DateTimeFormat(dateLocale(locale), { dateStyle: "medium", timeStyle: "short" });

  useEffect(() => {
    // The edit dialog on top takes the keyboard while it is open.
    if (paused) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev?.();
      if (e.key === "ArrowRight") onNext?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [paused, onClose, onPrev, onNext]);

  const arrow = "absolute top-1/2 z-10 -translate-y-1/2 rounded-full border border-line bg-ink/70 p-2 text-silver hover:border-gold hover:text-gold";

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-ink" onClick={onClose}>
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="min-w-0 text-sm">
          <div className="truncate font-medium text-silver">{p.project?.name}</div>
          <div className="text-xs text-silver-dim sm:truncate">
            {when.format(new Date(p.created_at))} · {k.by} {personName(p.author)}
            {p.stage ? ` · ${k.stage}: ${p.stage.title}` : ""}
          </div>
        </div>
        <button onClick={onClose} aria-label="Close" className="shrink-0 p-1 text-silver-dim hover:text-gold">
          <X size={22} />
        </button>
      </div>

      <div className="relative min-h-0 flex-1" onClick={(e) => e.stopPropagation()}>
        {p.url && <Image src={p.url} alt={p.caption ?? ""} fill sizes="100vw" className="object-contain" />}
        {onPrev && (
          <button onClick={onPrev} aria-label={k.previous} className={`${arrow} left-3`}>
            <ChevronLeft size={22} />
          </button>
        )}
        {onNext && (
          <button onClick={onNext} aria-label={k.next} className={`${arrow} right-3`}>
            <ChevronRight size={22} />
          </button>
        )}
      </div>

      <div
        className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-3 text-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {p.caption && <p className="w-full text-silver sm:w-auto sm:flex-1">{p.caption}</p>}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={onToggle} title={p.visible_to_client ? k.makeInternal : k.showToClient}>
            <Badge tone={p.visible_to_client ? "green" : "gray"}>
              {p.visible_to_client ? k.forClient : k.internalOnly}
            </Badge>
          </button>
          {p.url && (
            <a
              href={p.url}
              target="_blank"
              rel="noreferrer"
              title={k.openOriginal}
              className="inline-flex items-center justify-center rounded-md border border-line p-1.5 text-silver transition hover:border-gold hover:text-gold"
            >
              <ExternalLink size={16} />
            </a>
          )}
          <IconButton onClick={onEdit} title={k.edit}>
            <Pencil size={16} />
          </IconButton>
          <IconButton onClick={onDownload} title={k.download}>
            <Download size={16} />
          </IconButton>
          <IconButton danger onClick={onDelete} title={t.adminUi.delete}>
            <Trash2 size={16} />
          </IconButton>
        </div>
      </div>
    </div>
  );
}
