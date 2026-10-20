"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/button";
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
  Textarea,
  emptyToNull,
  must,
  useLoad,
} from "../kit";
import { removeUploaded } from "../upload";
import { ImageTile, Thumb, UploadTile, moveRow, useUploads } from "./portfolio";

type Service = {
  id: string;
  position: number;
  title_de: string;
  text_de: string | null;
  title_uk: string | null;
  text_uk: string | null;
  icon_url: string | null;
  published: boolean;
};

export function ServicesSection({ t }: { t: Dictionary }) {
  const a = t.adminUi;
  const { data, error, reload } = useLoad(async () =>
    must<Service[]>(
      await createClient()
        .from("services")
        .select("id, position, title_de, text_de, title_uk, text_uk, icon_url, published")
        .order("position")
        .order("created_at"),
    ),
  );
  const [editing, setEditing] = useState<Service | "new" | null>(null);
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
      <SectionHeader title={t.admin.sections.services}>
        <Button onClick={() => setEditing("new")}>
          <Plus size={16} /> {a.newService}
        </Button>
      </SectionHeader>
      <p className="-mt-3 mb-5 text-sm text-silver-dim">{a.servicesHint}</p>
      <ErrorNote error={error ?? actionError} />

      <Panel>
        <Table head={[a.photo, "Deutsch", "Українська", a.visibility, ""]}>
          {items.map((s, i) => (
            <tr key={s.id}>
              <td>
                <Thumb src={s.icon_url} />
              </td>
              <td>
                <div className="font-medium text-white">{s.title_de}</div>
                <div className="line-clamp-1 text-xs text-silver-dim">{s.text_de}</div>
              </td>
              <td>
                <div className="text-silver">{s.title_uk}</div>
                <div className="line-clamp-1 text-xs text-silver-dim">{s.text_uk}</div>
              </td>
              <td>
                <button
                  onClick={() =>
                    act(async () =>
                      must(await createClient().from("services").update({ published: !s.published }).eq("id", s.id)),
                    )
                  }
                >
                  <Badge tone={s.published ? "green" : "gray"}>{s.published ? a.shown : a.hidden}</Badge>
                </button>
              </td>
              <td>
                <div className="flex justify-end gap-1.5">
                  <IconButton title={a.moveUp} disabled={i === 0} onClick={() => act(() => moveRow("services", items, i, i - 1))}>
                    <ArrowUp size={14} />
                  </IconButton>
                  <IconButton
                    title={a.moveDown}
                    disabled={i === items.length - 1}
                    onClick={() => act(() => moveRow("services", items, i, i + 1))}
                  >
                    <ArrowDown size={14} />
                  </IconButton>
                  <IconButton onClick={() => setEditing(s)} title={a.edit}>
                    <Pencil size={14} />
                  </IconButton>
                  <IconButton
                    danger
                    title={a.delete}
                    onClick={() =>
                      window.confirm(a.confirmDelete) &&
                      act(async () => {
                        must(await createClient().from("services").delete().eq("id", s.id));
                        await removeUploaded(s.icon_url);
                      })
                    }
                  >
                    <Trash2 size={14} />
                  </IconButton>
                </div>
              </td>
            </tr>
          ))}
          {data && !items.length && <EmptyRow cols={5}>{a.noServices}</EmptyRow>}
        </Table>
      </Panel>

      {editing && (
        <ServiceModal
          t={t}
          service={editing === "new" ? null : editing}
          nextPosition={items.length ? Math.max(...items.map((s) => s.position)) + 1 : 0}
          onClose={() => setEditing(null)}
          onSaved={reload}
        />
      )}
    </div>
  );
}

function ServiceModal({
  t,
  service,
  nextPosition,
  onClose,
  onSaved,
}: {
  t: Dictionary;
  service: Service | null;
  nextPosition: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const a = t.adminUi;
  const [form, setForm] = useState({
    title_de: service?.title_de ?? "",
    text_de: service?.text_de ?? "",
    title_uk: service?.title_uk ?? "",
    text_uk: service?.text_uk ?? "",
    published: service?.published ?? true,
  });
  const [icon, setIcon] = useState<string | null>(service?.icon_url ?? null);
  const uploads = useUploads("services");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });

  async function cancel() {
    await uploads.discard([service?.icon_url ?? null]);
    onClose();
  }

  async function save() {
    if (!form.title_de.trim()) return setError(a.nameRequired);
    setBusy(true);
    setError(null);
    const row = {
      title_de: form.title_de.trim(),
      text_de: emptyToNull(form.text_de),
      title_uk: emptyToNull(form.title_uk),
      text_uk: emptyToNull(form.text_uk),
      icon_url: icon,
      published: form.published,
    };
    const table = createClient().from("services");
    try {
      must(service ? await table.update(row).eq("id", service.id) : await table.insert({ ...row, position: nextPosition }));
      if (service?.icon_url && service.icon_url !== icon) await removeUploaded(service.icon_url);
      await uploads.discard([icon]);
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <Modal title={service ? service.title_de : a.newService} onClose={cancel} wide>
      <div className="grid gap-6 sm:grid-cols-[1fr_12rem]">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={`${a.name} (DE)`}>
            <Input value={form.title_de} onChange={set("title_de")} />
          </Field>
          <Field label={`${a.name} (UA)`}>
            <Input value={form.title_uk} onChange={set("title_uk")} />
          </Field>
          <Field label={`${a.description} (DE)`}>
            <Textarea value={form.text_de} onChange={set("text_de")} rows={4} />
          </Field>
          <Field label={`${a.description} (UA)`}>
            <Textarea value={form.text_uk} onChange={set("text_uk")} rows={4} />
          </Field>
        </div>
        <div>
          <div className="mb-2 text-xs text-silver-dim">{a.photo}</div>
          {icon ? (
            <ImageTile src={icon} onRemove={() => setIcon(null)} />
          ) : (
            <UploadTile
              label={a.addPhoto}
              busy={uploads.busy}
              onFiles={async (files) => setIcon((await uploads.upload(files))[0] ?? null)}
            />
          )}
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
