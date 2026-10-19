import Image from "next/image";
import { Card, ProgressBar } from "@/components/app-shell";
import { getDictionary } from "@/i18n";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Stage = {
  id: string;
  title: string;
  position: number;
  status: "pending" | "in_progress" | "done";
  progress: number;
};

export default async function ClientHome() {
  const [{ t, locale }, supabase, user] = await Promise.all([
    getDictionary(),
    createClient(),
    getCurrentUser(),
  ]);

  // Only grants that are still valid; RLS hides the site once access expires.
  const { data: access } = await supabase
    .from("client_access")
    .select("project_id, expires_at")
    .eq("client_id", user!.id)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!access) {
    return (
      <Card>
        <p className="text-silver-dim">{t.client.noAccess}</p>
      </Card>
    );
  }

  const [{ data: project }, { data: stages }, { data: photos }] = await Promise.all([
    supabase.from("projects").select("name, address, progress").eq("id", access.project_id).single(),
    supabase
      .from("project_stages")
      .select("id, title, position, status, progress")
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
    ? (
        await supabase.storage
          .from("project-photos")
          .createSignedUrls(photos.map((p) => p.storage_path), 60 * 60)
      ).data ?? []
    : [];
  const urlByPath = new Map(signed.map((s) => [s.path, s.signedUrl]));

  const dateFormat = new Intl.DateTimeFormat(locale === "uk" ? "uk-UA" : "de-DE", { dateStyle: "medium" });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-white">{project?.name}</h1>
        {project?.address && <p className="mt-1 text-silver-dim">{project.address}</p>}
        <p className="mt-1 text-xs text-silver-dim">
          {t.client.validUntil} {dateFormat.format(new Date(access.expires_at))}
        </p>
      </div>

      <Card className="space-y-3">
        <div className="flex justify-between text-sm">
          <span>{t.common.progress}</span>
          <span className="text-olive-light">{project?.progress ?? 0}%</span>
        </div>
        <ProgressBar value={project?.progress ?? 0} />
      </Card>

      <section>
        <h2 className="mb-4 font-medium text-white">{t.client.stages}</h2>
        <ol className="space-y-2">
          {((stages ?? []) as Stage[]).map((s) => (
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
        {!photos?.length ? (
          <p className="text-sm text-silver-dim">{t.client.noPhotos}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {photos.map((p) => {
              const url = urlByPath.get(p.storage_path);
              return (
                <figure key={p.id} className="overflow-hidden rounded-xl border border-line bg-panel">
                  <div className="relative aspect-square bg-panel-2">
                    {url && <Image src={url} alt={p.caption ?? ""} fill sizes="25vw" className="object-cover" />}
                  </div>
                  <figcaption className="px-3 py-2 text-xs text-silver-dim">
                    {dateFormat.format(new Date(p.taken_at))}
                    {p.caption ? ` · ${p.caption}` : ""}
                  </figcaption>
                </figure>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
