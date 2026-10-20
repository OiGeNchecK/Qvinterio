"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ExternalLink, ImagePlus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/button";
import { company } from "@/content/company";
import { createClient } from "@/lib/supabase/client";
import type { Dictionary } from "@/i18n";
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
  emptyToNull,
  must,
  useLoad,
} from "../kit";
import { removeUploaded, uploadImage } from "../upload";
import { Thumb, moveRow } from "./portfolio";

type Post = {
  id: string;
  position: number;
  image_url: string;
  post_url: string | null;
  published: boolean;
};

const LINK_RE = /^https:\/\/(www\.)?instagram\.com\//;

// Photos for the Instagram block on the homepage.
export function InstagramSection({ t }: { t: Dictionary }) {
  const a = t.adminUi;
  const { data, error, reload } = useLoad(async () =>
    must<Post[]>(
      await createClient()
        .from("instagram_posts")
        .select("id, position, image_url, post_url, published")
        .order("position")
        .order("created_at"),
    ),
  );
  const [editing, setEditing] = useState<Post | null>(null);
  const [busy, setBusy] = useState(false);
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

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    await act(async () => {
      let position = items.length ? Math.max(...items.map((p) => p.position)) + 1 : 0;
      for (const file of Array.from(files)) {
        const image_url = await uploadImage(file, "instagram");
        must(await createClient().from("instagram_posts").insert({ image_url, position: position++ }));
      }
    });
    setBusy(false);
  }

  return (
    <div>
      <SectionHeader title={t.admin.sections.instagram}>
        <a
          href={company.instagram.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm font-medium text-silver transition hover:border-olive hover:text-white"
        >
          <ExternalLink size={16} /> {a.profile}
        </a>
        <label className={busy ? "pointer-events-none opacity-50" : "cursor-pointer"}>
          <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-olive-light to-olive px-5 py-2.5 text-sm font-medium text-ink shadow-[0_0_24px_-8px_var(--color-gold)] transition hover:brightness-110">
            <ImagePlus size={16} /> {busy ? "…" : a.addPhotos}
          </span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              add(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </SectionHeader>
      <p className="-mt-3 mb-5 text-sm text-silver-dim">{a.instagramHint}</p>
      <ErrorNote error={error ?? actionError} />

      <Panel>
        <Table head={[a.photo, a.instagramLink, a.visibility, ""]}>
          {items.map((p, i) => (
            <tr key={p.id}>
              <td>
                <Thumb src={p.image_url} className="h-14 w-14" />
              </td>
              <td className="max-w-xs truncate text-silver-dim">{p.post_url ?? `— ${a.profile}`}</td>
              <td>
                <button
                  onClick={() =>
                    act(async () =>
                      must(await createClient().from("instagram_posts").update({ published: !p.published }).eq("id", p.id)),
                    )
                  }
                >
                  <Badge tone={p.published ? "green" : "gray"}>{p.published ? a.shown : a.hidden}</Badge>
                </button>
              </td>
              <td>
                <div className="flex justify-end gap-1.5">
                  <IconButton title={a.moveUp} disabled={i === 0} onClick={() => act(() => moveRow("instagram_posts", items, i, i - 1))}>
                    <ArrowUp size={14} />
                  </IconButton>
                  <IconButton
                    title={a.moveDown}
                    disabled={i === items.length - 1}
                    onClick={() => act(() => moveRow("instagram_posts", items, i, i + 1))}
                  >
                    <ArrowDown size={14} />
                  </IconButton>
                  <IconButton onClick={() => setEditing(p)} title={a.edit}>
                    <Pencil size={14} />
                  </IconButton>
                  <IconButton
                    danger
                    title={a.delete}
                    onClick={() =>
                      window.confirm(a.confirmDelete) &&
                      act(async () => {
                        must(await createClient().from("instagram_posts").delete().eq("id", p.id));
                        await removeUploaded(p.image_url);
                      })
                    }
                  >
                    <Trash2 size={14} />
                  </IconButton>
                </div>
              </td>
            </tr>
          ))}
          {data && !items.length && <EmptyRow cols={4}>{a.noInstagram}</EmptyRow>}
        </Table>
      </Panel>

      {editing && <LinkModal t={t} post={editing} onClose={() => setEditing(null)} onSaved={reload} />}
    </div>
  );
}

function LinkModal({ t, post, onClose, onSaved }: { t: Dictionary; post: Post; onClose: () => void; onSaved: () => void }) {
  const a = t.adminUi;
  const [link, setLink] = useState(post.post_url ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const post_url = emptyToNull(link);
    if (post_url && !LINK_RE.test(post_url)) return setError(a.instagramLinkInvalid);
    setBusy(true);
    try {
      must(await createClient().from("instagram_posts").update({ post_url }).eq("id", post.id));
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <Modal title={t.admin.sections.instagram} onClose={onClose}>
      <div className="flex gap-4">
        <Thumb src={post.image_url} className="h-24 w-24" />
        <div className="flex-1">
          <Field label={a.instagramLink}>
            <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://www.instagram.com/p/…" />
          </Field>
          <p className="mt-2 text-xs text-silver-dim">{a.instagramLinkHint}</p>
        </div>
      </div>
      <ErrorNote error={error} />
      <ModalActions>
        <Button variant="ghost" onClick={onClose}>
          {a.cancel}
        </Button>
        <Button onClick={save} disabled={busy}>
          {a.save}
        </Button>
      </ModalActions>
    </Modal>
  );
}
