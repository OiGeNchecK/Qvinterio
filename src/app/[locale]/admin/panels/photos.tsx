"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Trash2, X } from "lucide-react";
import { Button } from "@/components/button";
import { createClient } from "@/lib/supabase/client";
import { dateLocale, type Dictionary, type Locale } from "@/i18n";
import { Badge, ErrorNote, IconButton, Panel, SectionHeader, Select, must, useLoad } from "../kit";
import { loadPeople, loadProjectRefs, personName } from "../data";

const BUCKET = "project-photos";
const PAGE = 120;

export type SitePhoto = {
  id: string;
  project_id: string;
  author_id: string | null;
  storage_path: string;
  caption: string | null;
  visible_to_client: boolean;
  taken_at: string;
  project: { name: string } | null;
  stage: { title: string } | null;
  author: { full_name: string; email: string | null } | null;
  url?: string;
};

type Filter = { project: string; author: string; visibility: "" | "client" | "internal" };

// Newest first, with a signed URL for each file (the bucket is private).
export async function loadSitePhotos(filter: Partial<Filter>, limit: number) {
  const supabase = createClient();
  let query = supabase
    .from("photos")
    .select(
      "id, project_id, author_id, storage_path, caption, visible_to_client, taken_at, project:projects(name), stage:project_stages(title), author:profiles(full_name, email)",
    )
    .order("taken_at", { ascending: false })
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

// Photos the workers upload, for admins and the Bauleitung, grouped by day.
export function PhotosSection({ locale, t }: { locale: Locale; t: Dictionary }) {
  const k = t.sitePhotos;
  const a = t.adminUi;
  // Links from the site list arrive as ?project=<id>. The guard in the admin
  // layout renders this only in the browser, so window is available.
  const [filter, setFilter] = useState<Filter>(() => ({
    project: new URLSearchParams(window.location.search).get("project") ?? "",
    author: "",
    visibility: "",
  }));
  const [limit, setLimit] = useState(PAGE);
  const refs = useLoad(async () => {
    const [projects, people] = await Promise.all([loadProjectRefs(), loadPeople()]);
    return { projects, people };
  });
  const { data, error, reload } = useLoad(() => loadSitePhotos(filter, limit));
  const [actionError, setActionError] = useState<string | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

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
    const d = new Date(photo.taken_at);
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
                      {time.format(new Date(p.taken_at))} · {personName(p.author)}
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

      {opened && openIndex !== null && (
        <PhotoViewer
          photo={opened}
          locale={locale}
          t={t}
          onClose={() => setOpenIndex(null)}
          onPrev={openIndex > 0 ? () => setOpenIndex(openIndex - 1) : undefined}
          onNext={openIndex < photos.length - 1 ? () => setOpenIndex(openIndex + 1) : undefined}
          onToggle={() => toggle(opened)}
          onDelete={() => remove(opened)}
        />
      )}
    </div>
  );
}

// Full-screen view with arrows (also on the keyboard) and the photo details.
function PhotoViewer({
  photo: p,
  locale,
  t,
  onClose,
  onPrev,
  onNext,
  onToggle,
  onDelete,
}: {
  photo: SitePhoto;
  locale: Locale;
  t: Dictionary;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const k = t.sitePhotos;
  const when = new Intl.DateTimeFormat(dateLocale(locale), { dateStyle: "medium", timeStyle: "short" });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev?.();
      if (e.key === "ArrowRight") onNext?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  const arrow = "absolute top-1/2 z-10 -translate-y-1/2 rounded-full border border-line bg-ink/70 p-2 text-silver hover:border-gold hover:text-gold";

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-ink" onClick={onClose}>
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="min-w-0 text-sm">
          <div className="truncate font-medium text-silver">{p.project?.name}</div>
          <div className="text-xs text-silver-dim sm:truncate">
            {when.format(new Date(p.taken_at))} · {k.by} {personName(p.author)}
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
          <IconButton danger onClick={onDelete} title={t.adminUi.delete}>
            <Trash2 size={16} />
          </IconButton>
        </div>
      </div>
    </div>
  );
}
