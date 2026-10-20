"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/button";
import { createClient } from "@/lib/supabase/client";
import { LOCALES, localeLabel, type Dictionary, type Locale } from "@/i18n";
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

// German is required; other languages fall back to German on the website.
const TRANSLATIONS = LOCALES.filter((l) => l !== "de");

type TextFields = Record<`title_${Locale}` | `text_${Locale}`, string | null>;

type Service = TextFields & {
  id: string;
  position: number;
  title_de: string;
  icon_url: string | null;
  published: boolean;
};

const TEXT_COLUMNS = LOCALES.map((l) => `title_${l}, text_${l}`).join(", ");

export function ServicesSection({ t }: { t: Dictionary }) {
  const a = t.adminUi;
  const { data, error, reload } = useLoad(async () =>
    must<Service[]>(
      await createClient()
        .from("services")
        .select(`id, position, ${TEXT_COLUMNS}, icon_url, published`)
        .order("position")
        .order("created_at")
        .overrideTypes<Service[], { merge: false }>(),
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
        <Table head={[a.photo, a.name, a.translations, a.visibility, ""]}>
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
                <div className="flex gap-1">
                  {TRANSLATIONS.map((l) => (
                    <Badge key={l} tone={s[`title_${l}`] ? "olive" : "gray"}>
                      {localeLabel(l)}
                    </Badge>
                  ))}
                </div>
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
  const [texts, setTexts] = useState(
    () =>
      Object.fromEntries(
        LOCALES.flatMap((l) => [
          [`title_${l}`, service?.[`title_${l}`] ?? ""],
          [`text_${l}`, service?.[`text_${l}`] ?? ""],
        ]),
      ) as Record<keyof TextFields, string>,
  );
  const [published, setPublished] = useState(service?.published ?? true);
  const [icon, setIcon] = useState<string | null>(service?.icon_url ?? null);
  const uploads = useUploads("services");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof TextFields) => (e: { target: { value: string } }) => setTexts({ ...texts, [key]: e.target.value });

  async function cancel() {
    await uploads.discard([service?.icon_url ?? null]);
    onClose();
  }

  async function save() {
    if (!texts.title_de.trim()) return setError(a.nameRequired);
    setBusy(true);
    setError(null);
    const row = {
      ...Object.fromEntries(Object.entries(texts).map(([k, v]) => [k, emptyToNull(v)])),
      title_de: texts.title_de.trim(),
      icon_url: icon,
      published,
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
        <div>
          <div className="grid gap-x-4 gap-y-6 sm:grid-cols-2">
            {LOCALES.map((l) => (
              <div key={l} className="grid content-start gap-3">
                <Field label={`${a.name} (${localeLabel(l)})`}>
                  <Input value={texts[`title_${l}`]} onChange={set(`title_${l}`)} />
                </Field>
                <Field label={`${a.description} (${localeLabel(l)})`}>
                  <Textarea value={texts[`text_${l}`]} onChange={set(`text_${l}`)} rows={3} />
                </Field>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-silver-dim">{a.translationsHint}</p>
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
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
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
