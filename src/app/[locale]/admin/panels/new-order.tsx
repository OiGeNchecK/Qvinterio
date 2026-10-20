"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
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
  Select,
  Table,
  Textarea,
  emptyToNull,
  must,
  useLoad,
} from "../kit";
import { ORDER_CATEGORIES, type OrderCategory, type ProjectRef } from "../data";
import type { ContactRef } from "./orders";

export type CatalogItem = { id: string; category: OrderCategory; name: string; unit: string; active: boolean };

export const CUSTOM = "__custom";
const UNITS = ["Stk", "m", "m²", "m³", "kg", "t", "Paket", "Rolle", "Sack", "Palette"];

// Containers a worker can ask for, with the unit picked by default; the
// amount is either a size in m³ or a number of pieces.
const CONTAINER_TYPES = [
  { name: "Container Baumischabfall", unit: "m³" },
  { name: "Container Bauschutt", unit: "m³" },
  { name: "Container Glas", unit: "m³" },
  { name: "KMF-Säcke (Mineralwolle)", unit: "Stk" },
];
const CONTAINER_UNITS = ["m³", "Stk"];

// The API returns at most 1000 rows per request, so the catalog is read in pages.
export async function loadCatalog() {
  const supabase = createClient();
  const all: CatalogItem[] = [];
  for (let from = 0; ; from += 1000) {
    const page = must<CatalogItem[]>(
      await supabase
        .from("catalog_items")
        .select("id, category, name, unit, active")
        .order("category")
        .order("name")
        .order("id")
        .range(from, from + 999),
    );
    all.push(...page);
    if (page.length < 1000) return all;
  }
}

export type Line = { pick: string; text: string; quantity: string; unit: string };
export const emptyLine = (): Line => ({ pick: "", text: "", quantity: "1", unit: "Stk" });

// New order placed by the office: catalog items or free text. Workers get it
// without the supplier field and with free text only (freeText); the office
// then orders the concrete items.
export function NewOrderModal({
  t,
  projects,
  contacts,
  projectId = "",
  freeText = false,
  onClose,
  onSaved,
}: {
  t: Dictionary;
  projects: ProjectRef[];
  contacts?: ContactRef[];
  projectId?: string;
  freeText?: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const a = t.adminUi;
  const catalog = useLoad(freeText ? async () => [] as CatalogItem[] : loadCatalog);
  const newLine = (): Line => (freeText ? { ...emptyLine(), pick: CUSTOM } : emptyLine());
  const [form, setForm] = useState({
    project_id: projectId,
    category: "material" as OrderCategory,
    contact_id: "",
    needed_by: "",
    note: "",
  });
  const [lines, setLines] = useState<Line[]>(() => [newLine()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setCategory(category: OrderCategory) {
    setForm({ ...form, category });
    // Free text lines switch between typed items and the container list.
    const listChanged = freeText && (category === "container") !== (form.category === "container");
    setLines(
      lines.map((l) => ({
        ...l,
        pick: l.pick === CUSTOM ? CUSTOM : "",
        ...(listChanged ? { text: "", unit: category === "container" ? "m³" : "Stk" } : {}),
      })),
    );
  }

  async function save() {
    const items = linesToItems(lines, catalog.data ?? []);
    if (!form.project_id || (!items.length && !form.note.trim())) return setError(a.orderNeedsSite);
    setBusy(true);
    setError(null);
    const supabase = createClient();
    try {
      const order = must<{ id: string }>(
        await supabase
          .from("orders")
          .insert({
            project_id: form.project_id,
            category: form.category,
            contact_id: form.contact_id || null,
            needed_by: form.needed_by || null,
            note: emptyToNull(form.note),
          })
          .select("id")
          .single(),
      );
      if (items.length) must(await supabase.from("order_items").insert(items.map((i) => ({ ...i, order_id: order.id }))));
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <Modal title={a.newOrder} onClose={onClose} wide>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={a.site}>
          <Select
            value={form.project_id}
            disabled={!!projectId}
            onChange={(e) => setForm({ ...form, project_id: e.target.value })}
          >
            <option value="">—</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        {freeText ? (
          // Big buttons instead of a dropdown: workers order from their phones.
          <div className="space-y-1.5 sm:col-span-2">
            <span className="text-xs text-silver-dim">{a.category}</span>
            <div className="flex flex-wrap gap-2">
              {ORDER_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    form.category === c ? "border-gold bg-gold/15 text-gold" : "border-line text-silver hover:border-gold/60"
                  }`}
                >
                  {t.orderCategory[c]}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <Field label={a.category}>
            <Select value={form.category} onChange={(e) => setCategory(e.target.value as OrderCategory)}>
              {ORDER_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t.orderCategory[c]}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {contacts && (
          <Field label={a.supplier}>
            <Select value={form.contact_id} onChange={(e) => setForm({ ...form, contact_id: e.target.value })}>
              <option value="">—</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {[c.company, c.person].filter(Boolean).join(" · ")}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label={a.neededBy}>
          <Input type="date" value={form.needed_by} onChange={(e) => setForm({ ...form, needed_by: e.target.value })} />
        </Field>
      </div>

      <div className="mt-6">
        <div className="mb-2 text-xs text-silver-dim">{a.items}</div>
        <ItemLines
          t={t}
          category={form.category}
          freeText={freeText}
          catalog={catalog.data ?? []}
          lines={lines}
          setLines={setLines}
        />
      </div>

      <Field label={a.comment} className="mt-6">
        <Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
      </Field>

      <ErrorNote error={error ?? catalog.error} />
      <ModalActions>
        <Button variant="ghost" onClick={onClose}>
          {a.cancel}
        </Button>
        <Button onClick={save} disabled={busy}>
          {a.create}
        </Button>
      </ModalActions>
    </Modal>
  );
}

// Item rows of an order: a catalog item or own text, quantity and unit. With
// freeText there is no catalog, and containers come from a fixed list.
export function ItemLines({
  t,
  category,
  freeText = false,
  catalog,
  lines,
  setLines,
}: {
  t: Dictionary;
  category: OrderCategory;
  freeText?: boolean;
  catalog: CatalogItem[];
  lines: Line[];
  setLines: (lines: Line[]) => void;
}) {
  const a = t.adminUi;
  const options = catalog.filter((c) => c.active && c.category === category);
  const byId = new Map(catalog.map((c) => [c.id, c]));
  const containers = category === "container";
  const newLine = (): Line => (freeText ? { ...emptyLine(), pick: CUSTOM } : emptyLine());
  const setLine = (i: number, patch: Partial<Line>) => setLines(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  return (
    <>
    <div className="space-y-2">
      {lines.map((l, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-start gap-2 sm:grid-cols-[1fr_5rem_6rem_auto]">
          <div className="col-span-3 space-y-2 sm:col-span-1">
            {!freeText && (
              <Select value={l.pick} onChange={(e) => setLine(i, { pick: e.target.value })}>
                <option value="">{a.pickItem}</option>
                {options.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value={CUSTOM}>✎ {a.customItem}</option>
              </Select>
            )}
            {freeText && containers ? (
              <Select
                value={l.text}
                onChange={(e) =>
                  setLine(i, {
                    text: e.target.value,
                    unit: CONTAINER_TYPES.find((c) => c.name === e.target.value)?.unit ?? l.unit,
                  })
                }
              >
                <option value="">{a.pickContainer}</option>
                {CONTAINER_TYPES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </Select>
            ) : l.pick === CUSTOM && (
              <Input
                autoFocus={!freeText || i > 0}
                value={l.text}
                onChange={(e) => setLine(i, { text: e.target.value })}
                placeholder={a.customItemHint}
              />
            )}
          </div>
          <Input inputMode="decimal" value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} />
          {l.pick && l.pick !== CUSTOM ? (
            <Input value={byId.get(l.pick)?.unit ?? ""} disabled />
          ) : (
            <Select value={l.unit} onChange={(e) => setLine(i, { unit: e.target.value })}>
              {(freeText && containers ? CONTAINER_UNITS : UNITS).map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
          )}
          <IconButton
            danger
            className="mt-1"
            disabled={lines.length === 1}
            onClick={() => setLines(lines.filter((_, j) => j !== i))}
            aria-label={a.delete}
          >
            <Trash2 size={14} />
          </IconButton>
        </div>
      ))}
    </div>
    <Button variant="ghost" className="mt-3" onClick={() => setLines([...lines, newLine()])}>
      <Plus size={16} /> {a.addLine}
    </Button>
    </>
  );
}

// Turns the rows into order_items fields; empty rows are dropped.
export function linesToItems(lines: Line[], catalog: CatalogItem[]) {
  const byId = new Map(catalog.map((c) => [c.id, c]));
  return lines
    .map((l) => {
      const item = l.pick && l.pick !== CUSTOM ? byId.get(l.pick) : undefined;
      return {
        catalog_item_id: item?.id ?? null,
        description: (item?.name ?? l.text).trim(),
        quantity: Number(l.quantity.replace(",", ".")) || 1,
        unit: item?.unit ?? l.unit,
      };
    })
    .filter((i) => i.description);
}

// List of materials, containers etc. that can be picked in orders.
export function CatalogModal({ t, onClose }: { t: Dictionary; onClose: () => void }) {
  const a = t.adminUi;
  const { data, error, reload } = useLoad(loadCatalog);
  const [form, setForm] = useState({ category: "material" as OrderCategory, name: "", unit: "Stk" });
  const [filter, setFilter] = useState<"" | OrderCategory>("");
  const [actionError, setActionError] = useState<string | null>(null);

  async function run(action: PromiseLike<{ error: { message: string } | null }>) {
    const { error } = await action;
    setActionError(error?.message ?? null);
    reload();
  }

  const items = (data ?? []).filter((c) => !filter || c.category === filter);

  return (
    <Modal title={a.catalog} onClose={onClose} wide>
      <p className="-mt-2 mb-4 text-sm text-silver-dim">{a.catalogHint}</p>
      <form
        className="grid gap-2 sm:grid-cols-[10rem_1fr_7rem_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.name.trim()) return;
          run(createClient().from("catalog_items").insert({ ...form, name: form.name.trim() }));
          setForm({ ...form, name: "" });
        }}
      >
        <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as OrderCategory })}>
          {ORDER_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {t.orderCategory[c]}
            </option>
          ))}
        </Select>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={a.catalogNameHint} />
        <Select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
          {UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </Select>
        <Button type="submit">
          <Plus size={16} /> {a.add}
        </Button>
      </form>
      <ErrorNote error={error ?? actionError} />

      <div className="mb-3 mt-6 flex flex-wrap gap-1.5">
        {(["", ...ORDER_CATEGORIES] as const).map((c) => (
          <button
            key={c || "all"}
            onClick={() => setFilter(c)}
            className={`rounded-md border px-2.5 py-1 text-xs transition ${
              filter === c ? "border-gold bg-gold/15 text-gold" : "border-line text-silver-dim hover:border-gold/60"
            }`}
          >
            {c ? t.orderCategory[c] : a.allTypes}
          </button>
        ))}
      </div>
      <div className="px-6 sm:px-8">
        <Table head={[a.category, a.name, a.unit, a.visibility, ""]}>
          {items.map((c) => (
            <tr key={c.id}>
              <td className="text-silver-dim">{t.orderCategory[c.category]}</td>
              <td className="text-white">{c.name}</td>
              <td className="text-silver-dim">{c.unit}</td>
              <td>
                <button onClick={() => run(createClient().from("catalog_items").update({ active: !c.active }).eq("id", c.id))}>
                  <Badge tone={c.active ? "green" : "gray"}>{c.active ? a.shown : a.hidden}</Badge>
                </button>
              </td>
              <td>
                <div className="flex justify-end">
                  <IconButton
                    danger
                    title={a.delete}
                    onClick={() =>
                      window.confirm(a.confirmDelete) && run(createClient().from("catalog_items").delete().eq("id", c.id))
                    }
                  >
                    <Trash2 size={14} />
                  </IconButton>
                </div>
              </td>
            </tr>
          ))}
          {data && !items.length && <EmptyRow cols={5}>{a.catalogEmpty}</EmptyRow>}
        </Table>
      </div>
      <ModalActions>
        <Button variant="ghost" onClick={onClose}>
          {a.close}
        </Button>
      </ModalActions>
    </Modal>
  );
}
