import { Card, ProgressBar } from "@/components/app-shell";
import { getDictionary } from "@/i18n";
import { createClient } from "@/lib/supabase/server";

export default async function WorkerHome() {
  const [{ t }, supabase] = await Promise.all([getDictionary(), createClient()]);
  // RLS limits this to the sites the user is assigned to.
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, address, progress")
    .in("status", ["planned", "active"])
    .order("name");

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl text-white">{t.worker.myProjects}</h1>
      {!projects?.length ? (
        <Card>
          <p className="text-silver-dim">{t.worker.noProjects}</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Card key={p.id} className="space-y-4">
              <div>
                <h2 className="font-medium text-white">{p.name}</h2>
                {p.address && <p className="text-sm text-silver-dim">{p.address}</p>}
              </div>
              <ProgressBar value={p.progress} />
              <div className="flex gap-2 text-sm">
                <span className="rounded-full bg-olive/90 px-3 py-1.5 text-ink">{t.worker.newOrder}</span>
                <span className="rounded-full border border-line px-3 py-1.5">{t.worker.uploadPhotos}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
