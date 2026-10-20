"use client";

import Image from "next/image";
import { Camera, ShoppingCart } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/auth";
import { dateLocale, type Dictionary, type Locale } from "@/i18n";
import { Badge, ErrorNote, must, useLoad } from "../admin/kit";
import { OrderCard, loadOrders, type SiteOrder } from "./site-orders";
import type { WorkerSite } from "./worker-home";

type MyPhoto = { id: string; storage_path: string; caption: string | null; visible_to_client: boolean; created_at: string; url?: string };
type Entry = { kind: "order"; at: string; order: SiteOrder } | { kind: "photos"; at: string; photos: MyPhoto[] };

async function loadHistory(projectId: string, userId: string) {
  const supabase = createClient();
  const [orders, photos] = await Promise.all([
    loadOrders(projectId, userId),
    supabase
      .from("photos")
      .select("id, storage_path, caption, visible_to_client, created_at")
      .eq("project_id", projectId)
      .eq("author_id", userId)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  const list = must<MyPhoto[]>(photos);
  const signed = list.length
    ? ((await supabase.storage.from("project-photos").createSignedUrls(list.map((p) => p.storage_path), 60 * 60)).data ?? [])
    : [];
  const urlByPath = new Map(signed.map((s) => [s.path, s.signedUrl]));

  // Photos uploaded on the same day form one entry.
  const days = new Map<string, MyPhoto[]>();
  for (const p of list) {
    const day = p.created_at.slice(0, 10);
    days.set(day, [...(days.get(day) ?? []), { ...p, url: urlByPath.get(p.storage_path) ?? undefined }]);
  }
  const entries: Entry[] = [
    ...orders.orders.map((order) => ({ kind: "order" as const, at: order.created_at, order })),
    ...[...days.values()].map((photos) => ({ kind: "photos" as const, at: photos[0].created_at, photos })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  return { entries, people: orders.people };
}

// What this worker ordered and uploaded on the site, newest first.
export function SiteHistory({ site, locale, t, onChanged }: { site: WorkerSite; locale: Locale; t: Dictionary; onChanged: () => void }) {
  const w = t.worker;
  const me = useUser();
  const { data, error, reload } = useLoad(() => loadHistory(site.id, me.id));
  const dateTime = new Intl.DateTimeFormat(dateLocale(locale), { dateStyle: "short", timeStyle: "short" });

  return (
    <div className="space-y-4">
      <p className="text-sm text-silver-dim">{w.historyHint}</p>
      <ErrorNote error={error} />
      {data && !data.entries.length && (
        <p className="rounded-xl border border-line bg-panel/70 px-4 py-6 text-center text-sm text-silver-dim">{w.noHistory}</p>
      )}
      <ol className="space-y-3">
        {data?.entries.map((e) =>
          e.kind === "order" ? (
            <li key={e.order.id} className="flex gap-3">
              <ShoppingCart size={16} className="mt-4 shrink-0 text-gold" />
              <ul className="min-w-0 flex-1">
                <OrderCard
                  order={e.order}
                  people={data.people}
                  locale={locale}
                  t={t}
                  onChanged={() => {
                    reload();
                    onChanged();
                  }}
                />
              </ul>
            </li>
          ) : (
            <li key={e.photos[0].id} className="flex gap-3">
              <Camera size={16} className="mt-4 shrink-0 text-gold" />
              <div className="min-w-0 flex-1 rounded-xl border border-line bg-panel/80 p-4">
                <div className="text-xs text-silver-dim">
                  {dateTime.format(new Date(e.at))} · {w.photosUploaded.replace("{n}", String(e.photos.length))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {e.photos.map((p) => (
                    <a
                      key={p.id}
                      href={p.url}
                      target="_blank"
                      rel="noreferrer"
                      title={p.caption ?? ""}
                      className="relative block h-16 w-16 overflow-hidden rounded-lg border border-line bg-panel-2"
                    >
                      {p.url && <Image src={p.url} alt={p.caption ?? ""} fill sizes="64px" className="object-cover" />}
                    </a>
                  ))}
                </div>
                <div className="mt-2">
                  <Badge tone="gray">
                    {w.visibleCount.replace("{n}", String(e.photos.filter((p) => p.visible_to_client).length))}
                  </Badge>
                </div>
              </div>
            </li>
          ),
        )}
      </ol>
    </div>
  );
}
