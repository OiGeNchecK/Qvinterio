"use client";

import Image from "next/image";
import { useRef } from "react";
import { FileText, Paperclip, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Dictionary } from "@/i18n";
import { must } from "../kit";
import { shrink } from "../upload";

// Photos, videos and files on site tasks: task-files/<project_id>/<task_id>/<file>.
const BUCKET = "task-files";
// The upload limit of the Supabase free plan; the bucket enforces it too.
export const MAX_FILE_BYTES = 50 * 1024 * 1024;

export type TaskFile = {
  id: string;
  comment_id: number | null;
  author_id: string | null;
  storage_path: string;
  name: string;
  mime: string | null;
  size: number | null;
  url?: string;
};

const FILE_SELECT = "id, comment_id, author_id, storage_path, name, mime, size";

async function withUrls(files: TaskFile[]) {
  if (!files.length) return files;
  const { data } = await createClient()
    .storage.from(BUCKET)
    .createSignedUrls(files.map((f) => f.storage_path), 60 * 60);
  const urlByPath = new Map((data ?? []).map((s) => [s.path, s.signedUrl]));
  return files.map((f) => ({ ...f, url: urlByPath.get(f.storage_path) ?? undefined }));
}

// Files of a task; with onlyTask, just those staff attached to the task itself.
export async function loadTaskFiles(taskId: string, onlyTask = false) {
  let query = createClient().from("site_task_files").select(FILE_SELECT).eq("task_id", taskId);
  if (onlyTask) query = query.is("comment_id", null);
  return withUrls(must<TaskFile[]>(await query.order("created_at")));
}

export function tooLarge(files: File[], t: Dictionary) {
  const big = files.find((f) => f.size > MAX_FILE_BYTES);
  return big ? t.tasks.tooLarge.replace("{name}", big.name) : null;
}

// Uploads one by one; photos are scaled down first. Throws on the first error.
export async function uploadTaskFiles(
  projectId: string,
  taskId: string,
  commentId: number | null,
  files: File[],
  onProgress: (done: number) => void,
) {
  const supabase = createClient();
  for (const [i, file] of files.entries()) {
    const blob = file.type.startsWith("image/") && file.type !== "image/gif" ? await shrink(file) : file;
    const ext =
      blob !== file && blob.type === "image/jpeg"
        ? "jpg"
        : (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
    const path = `${projectId}/${taskId}/${crypto.randomUUID()}.${ext}`;
    const contentType = blob.type || file.type || "application/octet-stream";
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType });
    if (error) throw new Error(error.message);
    const inserted = await supabase.from("site_task_files").insert({
      task_id: taskId,
      comment_id: commentId,
      storage_path: path,
      name: blob !== file ? file.name.replace(/\.[^.]+$/, "") + ".jpg" : file.name,
      mime: contentType,
      size: blob.size,
    });
    if (inserted.error) {
      await supabase.storage.from(BUCKET).remove([path]);
      throw new Error(inserted.error.message);
    }
    onProgress(i + 1);
  }
}

// Removes the stored files first, since deleting rows leaves them in storage.
export async function removeTaskFiles(paths: string[]) {
  if (paths.length) await createClient().storage.from(BUCKET).remove(paths);
}

export async function removeTaskFile(file: TaskFile) {
  await removeTaskFiles([file.storage_path]);
  const { error } = await createClient().from("site_task_files").delete().eq("id", file.id);
  if (error) throw new Error(error.message);
}

export async function taskFilePaths(column: "task_id" | "comment_id", value: string | number) {
  const rows = must<{ storage_path: string }[]>(
    await createClient().from("site_task_files").select("storage_path").eq(column, value),
  );
  return rows.map((r) => r.storage_path);
}

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Thumbnails for photos, a player for videos, a chip for other files.
export function FileGallery({
  files,
  canDelete,
  onDelete,
}: {
  files: TaskFile[];
  canDelete?: (f: TaskFile) => boolean;
  onDelete?: (f: TaskFile) => void;
}) {
  if (!files.length) return null;
  const remove = (f: TaskFile) =>
    canDelete?.(f) &&
    onDelete && (
      <button
        type="button"
        onClick={() => onDelete(f)}
        aria-label="Delete"
        className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-silver hover:text-red-400"
      >
        <X size={12} />
      </button>
    );

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {files.map((f) =>
        f.mime?.startsWith("image/") ? (
          <div key={f.id} className="relative h-20 w-20 overflow-hidden rounded-lg border border-line bg-panel-2">
            <a href={f.url} target="_blank" rel="noreferrer" title={f.name} className="block h-full w-full">
              {f.url && <Image src={f.url} alt={f.name} fill sizes="80px" className="object-cover" />}
            </a>
            {remove(f)}
          </div>
        ) : f.mime?.startsWith("video/") ? (
          <div key={f.id} className="relative w-full max-w-xs overflow-hidden rounded-lg border border-line bg-black">
            {f.url && <video src={f.url} controls playsInline preload="metadata" className="max-h-60 w-full" />}
            <a href={f.url} target="_blank" rel="noreferrer" className="block truncate px-2 py-1 text-xs text-silver-dim hover:text-gold">
              {f.name} · {formatSize(f.size)}
            </a>
            {remove(f)}
          </div>
        ) : (
          <div key={f.id} className="relative max-w-full">
            <a
              href={f.url}
              target="_blank"
              rel="noreferrer"
              className="flex max-w-full items-center gap-2 rounded-lg border border-line bg-panel-2 py-2 pl-3 pr-8 text-sm text-silver hover:border-gold/60"
            >
              <FileText size={16} className="shrink-0 text-gold" />
              <span className="truncate">{f.name}</span>
              <span className="shrink-0 text-xs text-silver-dim">{formatSize(f.size)}</span>
            </a>
            {remove(f)}
          </div>
        ),
      )}
    </div>
  );
}

// Button that picks files (camera, gallery or documents on phones) and the
// list of picked files before they are sent.
export function FilePicker({
  files,
  onChange,
  t,
  compact,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  t: Dictionary;
  compact?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <div>
      <input
        ref={input}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          onChange([...files, ...Array.from(e.target.files ?? [])]);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        aria-label={t.tasks.attach}
        title={t.tasks.attachHint}
        className={`inline-flex items-center justify-center gap-2 rounded-full border border-line text-sm text-silver transition hover:border-olive hover:text-white ${
          compact ? "h-11 w-11" : "px-4 py-2.5"
        }`}
      >
        <Paperclip size={16} />
        {!compact && t.tasks.attach}
      </button>
      {!compact && <p className="mt-1.5 text-xs text-silver-dim">{t.tasks.attachHint}</p>}
    </div>
  );
}

export function PickedFiles({ files, onChange }: { files: File[]; onChange: (files: File[]) => void }) {
  if (!files.length) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {files.map((f, i) => (
        <li
          key={`${f.name}-${i}`}
          className={`flex max-w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${
            f.size > MAX_FILE_BYTES ? "border-red-900 text-red-300" : "border-line text-silver"
          }`}
        >
          <span className="truncate">{f.name}</span>
          <span className="shrink-0 text-silver-dim">{formatSize(f.size)}</span>
          <button type="button" onClick={() => onChange(files.filter((_, j) => j !== i))} className="p-0.5 hover:text-red-400">
            <X size={12} />
          </button>
        </li>
      ))}
    </ul>
  );
}
