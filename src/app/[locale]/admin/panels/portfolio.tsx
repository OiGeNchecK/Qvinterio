"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ExternalLink, ImagePlus, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/button";
import { createClient } from "@/lib/supabase/client";
import { imageSrc, projectHref } from "@/lib/site-content";
import type { Dictionary, Locale } from "@/i18n";
import {
  Badge,
  EmptyRow,
  ErrorNote,
  Field,
  IconButton,
  Input,
  Modal,
  ModalActions,
  Panel,
  SectionHeader,
  Table,
  Textarea,
  emptyToNull,
  must,
  useLoad,
} from "../kit";
import { removeUploaded, uploadImage } from "../upload";

type Item = {
  id: string;
  slug: string | null;
  title: string;
  city: string | null;
  area: string | null;
  client: string | null;
  description: string | null;
  services: string[];
  cover_url: string | null;
  gallery: string[];
  published: boolean;
  position: number;
};

const SELECT = "id, slug, title, city, area, client, description, services, cover_url, gallery, published, position";

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function Thumb({ src, className = "h-12 w-16" }: { src: string | null; className?: string }) {
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-md border border-line bg-panel-2 ${className}`}>
      {src && <Image src={imageSrc(src)} alt="" fill sizes="96px" className="object-cover" />}
    </div>
  );
}

// Moves a row up or down and renumbers the list.
export async function moveRow(table: string, rows: { id: string; position: number }[], from: number, to: number) {
  const order = [...rows];
  order.splice(to, 0, ...order.splice(from, 1));
  const supabase = createClient();
  for (const [i, r] of order.entries()) {
    if (r.position !== i) must(await supabase.from(table).update({ position: i }).eq("id", r.id));
  }
}

export function PortfolioSection({ locale, t }: { locale: Locale; t: Dictionary }) {
  const a = t.adminUi;
  const { data, error, reload } = useLoad(async () =>
    must<Item[]>(await createClient().from("portfolio_items").select(SELECT).order("position").order("created_at")),
  );
  const [editing, setEditing] = useState<Item | "new" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function act(fn: () => Promise<unknown>) {
    try {
      await fn();
      setActionError(null);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    }
    reload();
  }

  const items = data ?? [];

  return (
    <div>
      <SectionHeader title={t.admin.sections.portfolio}>
        <Button onClick={() => setEditing("new")}>
          <Plus size={16} /> {a.newProjectRef}
        </Button>
      </SectionHeader>
      <p className="-mt-3 mb-5 text-sm text-silver-dim">{a.portfolioHint}</p>
      <ErrorNote error={error ?? actionError} />

      <Panel>
        <Table head={[a.photo, a.name, a.city, a.area, a.photos, a.visibility, ""]}>
          {items.map((p, i) => (
            <tr key={p.id}>
              <td>
                <Thumb src={p.cover_url} />
              </td>
              <td className="font-medium text-white">{p.title}</td>
              <td className="text-silver-dim">{p.city}</td>
              <td className="whitespace-nowrap text-silver-dim">{p.area}</td>
              <td className="text-silver-dim">{p.gallery.length + (p.cover_url ? 1 : 0)}</td>
              <td>
                <button
                  onClick={() =>
                    act(async () =>
                      must(await createClient().from("portfolio_items").update({ published: !p.published }).eq("id", p.id)),
                    )
                  }
                >
                  <Badge tone={p.published ? "green" : "gray"}>{p.published ? a.shown : a.hidden}</Badge>
                </button>
              </td>
              <td>
                <div className="flex justify-end gap-1.5">
                  <IconButton
                    title={a.moveUp}
                    disabled={i === 0}
                    onClick={() => act(() => moveRow("portfolio_items", items, i, i - 1))}
                  >
                    <ArrowUp size={14} />
                  </IconButton>
                  <IconButton
                    title={a.moveDown}
                    disabled={i === items.length - 1}
                    onClick={() => act(() => moveRow("portfolio_items", items, i, i + 1))}
                  >
                    <ArrowDown size={14} />
                  </IconButton>
                  {p.slug && p.published && (
                    <Link
                      href={projectHref(locale, p.slug)}
                      target="_blank"
                      title={a.view}
                      className="inline-flex items-center justify-center rounded-md border border-line p-1.5 text-silver transition hover:border-gold hover:text-gold"
                    >
                      <ExternalLink size={14} />
                    </Link>
                  )}
                  <IconButton onClick={() => setEditing(p)} title={a.edit}>
                    <Pencil size={14} />
                  </IconButton>
                  <IconButton
                    danger
                    title={a.delete}
                    onClick={() =>
                      window.confirm(a.confirmDelete) &&
                      act(async () => {
                        must(await createClient().from("portfolio_items").delete().eq("id", p.id));
                        await Promise.all([p.cover_url, ...p.gallery].map(removeUploaded));
                      })
                    }
                  >
                    <Trash2 size={14} />
                  </IconButton>
                </div>
              </td>
            </tr>
          ))}
          {data && !items.length && <EmptyRow cols={7}>{a.noPortfolio}</EmptyRow>}
        </Table>
      </Panel>

      {editing && (
        <PortfolioModal
          t={t}
          item={editing === "new" ? null : editing}
          nextPosition={items.length ? Math.max(...items.map((p) => p.position)) + 1 : 0}
          takenSlugs={new Set(items.map((p) => p.slug ?? ""))}
          onClose={() => setEditing(null)}
          onSaved={reload}
        />
      )}
    </div>
  );
}

// Keeps track of uploads so that cancelled ones can be deleted again.
export function useUploads(folder: string) {
  const fresh = useRef<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: FileList | null): Promise<string[]> {
    if (!files?.length) return [];
    setBusy(true);
    setError(null);
    const urls: string[] = [];
    try {
      for (const file of Array.from(files)) urls.push(await uploadImage(file, folder));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    fresh.current.push(...urls);
    setBusy(false);
    return urls;
  }

  // Deletes files uploaded in this dialog that are not kept.
  const discard = (kept: (string | null)[]) =>
    Promise.all(fresh.current.filter((u) => !kept.includes(u)).map(removeUploaded));

  return { upload, discard, busy, error };
}

export function UploadTile({ label, busy, multiple, onFiles }: { label: ReactNode; busy: boolean; multiple?: boolean; onFiles: (files: FileList | null) => void }) {
  return (
    <label
      className={`flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-line text-silver-dim transition hover:border-gold hover:text-gold ${
        busy ? "pointer-events-none opacity-50" : ""
      }`}
    >
      <ImagePlus size={20} />
      <span className="text-[11px]">{busy ? "…" : label}</span>
      <input
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </label>
  );
}

export function ImageTile({ src, onRemove, children }: { src: string; onRemove: () => void; children?: ReactNode }) {
  return (
    <div className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-line bg-panel-2">
      <Image src={imageSrc(src)} alt="" fill sizes="200px" className="object-cover" />
      {children}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove"
        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white hover:bg-red-700"
      >
        <X size={14} />
      </button>
    </div>
  );
}

function PortfolioModal({
  t,
  item,
  nextPosition,
  takenSlugs,
  onClose,
  onSaved,
}: {
  t: Dictionary;
  item: Item | null;
  nextPosition: number;
  takenSlugs: Set<string>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const a = t.adminUi;
  const [form, setForm] = useState({
    title: item?.title ?? "",
    city: item?.city ?? "",
    area: item?.area ?? "",
    client: item?.client ?? "",
    description: item?.description ?? "",
    services: item?.services.join("\n") ?? "",
    published: item?.published ?? true,
  });
  const [cover, setCover] = useState<string | null>(item?.cover_url ?? null);
  const [gallery, setGallery] = useState<string[]>(item?.gallery ?? []);
  const uploads = useUploads("projects");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });

  async function cancel() {
    await uploads.discard([item?.cover_url ?? null, ...(item?.gallery ?? [])]);
    onClose();
  }

  async function save() {
    if (!form.title.trim()) return setError(a.nameRequired);
    setBusy(true);
    setError(null);
    const row = {
      title: form.title.trim(),
      city: emptyToNull(form.city),
      area: emptyToNull(form.area),
      client: emptyToNull(form.client),
      description: emptyToNull(form.description),
      services: form.services
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      cover_url: cover,
      gallery,
      published: form.published,
    };
    const table = createClient().from("portfolio_items");
    try {
      if (item) {
        must(await table.update(row).eq("id", item.id));
      } else {
        const base = slugify(`${form.city} ${form.title}`) || "projekt";
        let slug = base;
        for (let n = 2; takenSlugs.has(slug); n++) slug = `${base}-${n}`;
        must(await table.insert({ ...row, slug, position: nextPosition }));
      }
      // Files removed in this dialog are deleted once the change is saved.
      const kept = [cover, ...gallery];
      await Promise.all([item?.cover_url ?? null, ...(item?.gallery ?? [])].filter((u) => !kept.includes(u)).map(removeUploaded));
      await uploads.discard(kept);
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <Modal title={item ? item.title : a.newProjectRef} onClose={cancel} wide>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={a.name}>
          <Input value={form.title} onChange={set("title")} />
        </Field>
        <Field label={a.city}>
          <Input value={form.city} onChange={set("city")} />
        </Field>
        <Field label={a.area}>
          <Input value={form.area} onChange={set("area")} placeholder="500 m²" />
        </Field>
        <Field label={t.project.client}>
          <Input value={form.client} onChange={set("client")} />
        </Field>
        <Field label={a.description} className="sm:col-span-2">
          <Textarea value={form.description} onChange={set("description")} rows={4} />
        </Field>
        <Field label={a.servicesPerLine} className="sm:col-span-2">
          <Textarea value={form.services} onChange={set("services")} rows={4} />
        </Field>
      </div>

      <div className="mt-6">
        <div className="mb-2 text-xs text-silver-dim">{a.coverPhoto}</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {cover ? (
            <ImageTile src={cover} onRemove={() => setCover(null)} />
          ) : (
            <UploadTile
              label={a.addPhoto}
              busy={uploads.busy}
              onFiles={async (files) => setCover((await uploads.upload(files))[0] ?? null)}
            />
          )}
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 text-xs text-silver-dim">{t.project.gallery}</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {gallery.map((src) => (
            <ImageTile key={src} src={src} onRemove={() => setGallery(gallery.filter((g) => g !== src))}>
              <button
                type="button"
                onClick={() => {
                  setGallery([...gallery.filter((g) => g !== src), ...(cover ? [cover] : [])]);
                  setCover(src);
                }}
                className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition group-hover:opacity-100"
              >
                {a.makeCover}
              </button>
            </ImageTile>
          ))}
          <UploadTile
            label={a.addPhotos}
            busy={uploads.busy}
            multiple
            onFiles={async (files) => {
              const urls = await uploads.upload(files);
              setGallery((g) => [...g, ...urls]);
            }}
          />
        </div>
      </div>

      <label className="mt-6 flex items-center gap-2 text-sm text-silver">
        <input
          type="checkbox"
          checked={form.published}
          onChange={(e) => setForm({ ...form, published: e.target.checked })}
          className="h-4 w-4 accent-[#c4a46b]"
        />
        {a.showOnWebsite}
      </label>

      <ErrorNote error={error ?? uploads.error} />
      <ModalActions>
        <Button variant="ghost" onClick={cancel}>
          {a.cancel}
        </Button>
        <Button onClick={save} disabled={busy || uploads.busy}>
          {a.save}
        </Button>
      </ModalActions>
    </Modal>
  );
}
