"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Card, ProgressBar } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/auth";
import { dateLocale, type Dictionary, type Locale } from "@/i18n";

type Stage = {
  id: string;
  title: string;
  status: "pending" | "in_progress" | "done";
};

type Photo = { id: string; caption: string | null; taken_at: string; url?: string };

type Site = {
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
      .select("id, title, status")
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
    expiresAt: access.expires_at,
    project,
    stages: (stages ?? []) as Stage[],
    photos: (photos ?? []).map((p) => ({ ...p, url: urlByPath.get(p.storage_path) ?? undefined })),
  };
}

export function ClientHome({ locale, t }: { locale: Locale; t: Dictionary }) {
  const user = useUser();
  const [site, setSite] = useState<Site | null | undefined>(undefined);

  useEffect(() => {
    loadSite(user.id).then(setSite);
  }, [user.id]);

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
              <span className="flex-1 text-white">{s.title}</span>
              <span className="text-xs text-silver-dim">{t.stageStatus[s.status]}</span>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="mb-4 font-medium text-white">{t.client.photos}</h2>
        {!site.photos.length ? (
          <p className="text-sm text-silver-dim">{t.client.noPhotos}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {site.photos.map((p) => (
              <figure key={p.id} className="overflow-hidden rounded-xl border border-line bg-panel">
                <div className="relative aspect-square bg-panel-2">
                  {p.url && <Image src={p.url} alt={p.caption ?? ""} fill sizes="25vw" className="object-cover" />}
                </div>
                <figcaption className="px-3 py-2 text-xs text-silver-dim">
                  {dateFormat.format(new Date(p.taken_at))}
                  {p.caption ? ` · ${p.caption}` : ""}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
