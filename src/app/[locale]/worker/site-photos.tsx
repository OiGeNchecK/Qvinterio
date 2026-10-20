"use client";

import Image from "next/image";
import { useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isStaff, useUser } from "@/lib/auth";
import { dateLocale, type Dictionary, type Locale } from "@/i18n";
import { Badge, ErrorNote, Field, IconButton, Input, Select, emptyToNull, must, useLoad } from "../admin/kit";
import type { WorkerSite } from "./worker-home";

const BUCKET = "project-photos";

type Photo = {
  id: string;
  author_id: string | null;
  stage_id: string | null;
  storage_path: string;
  caption: string | null;
  visible_to_client: boolean;
  taken_at: string;
  url?: string;
};
type Stage = { id: string; title: string };

async function loadPhotos(projectId: string) {
  const supabase = createClient();
  const [photos, stages] = await Promise.all([
    supabase
      .from("photos")
      .select("id, author_id, stage_id, storage_path, caption, visible_to_client, taken_at")
      .eq("project_id", projectId)
      .order("taken_at", { ascending: false })
      .limit(200),
    supabase.from("project_stages").select("id, title").eq("project_id", projectId).order("position"),
  ]);
  const list = must<Photo[]>(photos);
  const signed = list.length
    ? ((await supabase.storage.from(BUCKET).createSignedUrls(list.map((p) => p.storage_path), 60 * 60)).data ?? [])
    : [];
  const urlByPath = new Map(signed.map((s) => [s.path, s.signedUrl]));
  return {
    photos: list.map((p) => ({ ...p, url: urlByPath.get(p.storage_path) ?? undefined })),
    stages: must<Stage[]>(stages),
  };
}

// Phone photos are large; scale them down before upload. Falls back to the
// original file if the browser cannot decode it.
async function shrink(file: File, max = 2000): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1_500_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob ?? file;
  } catch {
    return file;
  }
}

// Site photos: workers upload, choose what the client may see.
export function SitePhotos({ site, locale, t }: { site: WorkerSite; locale: Locale; t: Dictionary }) {
  const w = t.worker;
  const a = t.adminUi;
  const me = useUser();
  const { data, error, reload } = useLoad(() => loadPhotos(site.id));
  const [form, setForm] = useState({ caption: "", stage_id: "", visible_to_client: true });
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const date = new Intl.DateTimeFormat(dateLocale(locale), { dateStyle: "medium" });
  const stageTitle = new Map(data?.stages.map((s) => [s.id, s.title]));
  const canEdit = (p: Photo) => p.author_id === me.id || isStaff(me);

  async function upload(files: File[]) {
    if (!files.length) return;
    const supabase = createClient();
    setActionError(null);
    setProgress({ done: 0, total: files.length });
    try {
      for (const [i, file] of files.entries()) {
        const blob = await shrink(file);
        const ext = blob.type === "image/jpeg" ? "jpg" : (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
        const path = `${site.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: blob.type || file.type });
        if (error) throw new Error(error.message);
        const inserted = await supabase.from("photos").insert({
          project_id: site.id,
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
      setForm({ ...form, caption: "" });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    }
    setProgress(null);
    reload();
  }

  async function toggle(p: Photo) {
    const { error } = await createClient().from("photos").update({ visible_to_client: !p.visible_to_client }).eq("id", p.id);
    setActionError(error?.message ?? null);
    reload();
  }

  async function remove(p: Photo) {
    if (!window.confirm(w.confirmDeletePhoto)) return;
    const supabase = createClient();
    const { error } = await supabase.from("photos").delete().eq("id", p.id);
    if (!error) await supabase.storage.from(BUCKET).remove([p.storage_path]);
    setActionError(error?.message ?? null);
    reload();
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-line bg-panel/80 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={w.caption}>
            <Input value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} />
          </Field>
          {!!data?.stages.length && (
            <Field label={w.stage}>
              <Select value={form.stage_id} onChange={(e) => setForm({ ...form, stage_id: e.target.value })}>
                <option value="">—</option>
                {data.stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-silver">
          <input
            type="checkbox"
            checked={form.visible_to_client}
            onChange={(e) => setForm({ ...form, visible_to_client: e.target.checked })}
            className="accent-[var(--color-gold)]"
          />
          {w.visibleToClient}
        </label>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label
            className={`inline-flex cursor-pointer items-center gap-2 rounded-full bg-gradient-to-b from-olive-light to-olive px-5 py-2.5 text-sm font-medium text-ink transition hover:brightness-110 ${
              progress ? "pointer-events-none opacity-50" : ""
            }`}
          >
            <Camera size={16} /> {w.uploadPhotos}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={!!progress}
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
        <p className="mt-3 text-xs text-silver-dim">{w.photosHint}</p>
      </div>
      <ErrorNote error={error ?? actionError} />

      {data && !data.photos.length && (
        <p className="rounded-xl border border-line bg-panel/70 px-4 py-6 text-center text-sm text-silver-dim">{w.noPhotos}</p>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {data?.photos.map((p) => (
          <figure key={p.id} className="overflow-hidden rounded-xl border border-line bg-panel">
            <a href={p.url} target="_blank" rel="noreferrer" className="relative block aspect-square bg-panel-2">
              {p.url && <Image src={p.url} alt={p.caption ?? ""} fill sizes="(min-width: 768px) 25vw, 50vw" className="object-cover" />}
            </a>
            <figcaption className="space-y-2 px-3 py-2 text-xs text-silver-dim">
              <div>
                {date.format(new Date(p.taken_at))}
                {p.stage_id && stageTitle.get(p.stage_id) ? ` · ${stageTitle.get(p.stage_id)}` : ""}
              </div>
              {p.caption && <div className="text-silver">{p.caption}</div>}
              <div className="flex items-center justify-between gap-2">
                {canEdit(p) ? (
                  <button onClick={() => toggle(p)} title={w.visibleToClient}>
                    <Badge tone={p.visible_to_client ? "green" : "gray"}>
                      {p.visible_to_client ? w.forClient : w.internalOnly}
                    </Badge>
                  </button>
                ) : (
                  <Badge tone={p.visible_to_client ? "green" : "gray"}>
                    {p.visible_to_client ? w.forClient : w.internalOnly}
                  </Badge>
                )}
                {canEdit(p) && (
                  <IconButton danger onClick={() => remove(p)} title={a.delete}>
                    <Trash2 size={13} />
                  </IconButton>
                )}
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
