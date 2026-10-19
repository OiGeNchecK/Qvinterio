"use client";

import { useEffect, useState } from "react";
import { Card, ProgressBar } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { Dictionary } from "@/i18n";

type Project = { id: string; name: string; address: string | null; progress: number };

export function WorkerHome({ t }: { t: Dictionary }) {
  const [projects, setProjects] = useState<Project[] | null>(null);

  useEffect(() => {
    // RLS limits this to the sites the user is assigned to.
    createClient()
      .from("projects")
      .select("id, name, address, progress")
      .in("status", ["planned", "active"])
      .order("name")
      .then(({ data }) => setProjects(data ?? []));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl text-white">{t.worker.myProjects}</h1>
      {projects && !projects.length ? (
        <Card>
          <p className="text-silver-dim">{t.worker.noProjects}</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects?.map((p) => (
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
