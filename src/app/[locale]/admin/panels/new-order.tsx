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

type CatalogItem = { id: string; category: OrderCategory; name: string; unit: string; active: boolean };

const CUSTOM = "__custom";
const UNITS = ["Stk", "m", "m²", "m³", "kg", "t", "Paket", "Rolle", "Sack", "Palette"];

async function loadCatalog() {
  return must<CatalogItem[]>(
    await createClient().from("catalog_items").select("id, category, name, unit, active").order("category").order("name"),
  );
}

type Line = { pick: string; text: string; quantity: string; unit: string };
const emptyLine = (): Line => ({ pick: "", text: "", quantity: "1", unit: "Stk" });

// New order placed by the office: catalog items or free text.
export function NewOrderModal({
  t,
  projects,
  onClose,
  onSaved,
}: {
  t: Dictionary;
  projects: ProjectRef[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const a = t.adminUi;
  const catalog = useLoad(loadCatalog);
  const [form, setForm] = useState({ project_id: "", category: "material" as OrderCategory, needed_by: "", note: "" });
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options = (catalog.data ?? []).filter((c) => c.active && c.category === form.category);
  const byId = new Map(catalog.data?.map((c) => [c.id, c]));
  const setLine = (i: number, patch: Partial<Line>) => setLines(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  async function save() {
    const items = lines
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
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={a.site}>
          <Select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
            <option value="">—</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={a.category}>
          <Select
            value={form.category}
            onChange={(e) => {
              setForm({ ...form, category: e.target.value as OrderCategory });
              setLines(lines.map((l) => ({ ...l, pick: l.pick === CUSTOM ? CUSTOM : "" })));
            }}
          >
            {ORDER_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t.orderCategory[c]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={a.neededBy}>
          <Input type="date" value={form.needed_by} onChange={(e) => setForm({ ...form, needed_by: e.target.value })} />
        </Field>
      </div>

      <div className="mt-6">
        <div className="mb-2 text-xs text-silver-dim">{a.items}</div>
        <div className="space-y-2">
          {lines.map((l, i) => (
            <div key={i} className="grid grid-cols-[1fr_5rem_6rem_auto] items-start gap-2">
              <div className="space-y-2">
                <Select value={l.pick} onChange={(e) => setLine(i, { pick: e.target.value })}>
                  <option value="">{a.pickItem}</option>
                  {options.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  <option value={CUSTOM}>✎ {a.customItem}</option>
                </Select>
                {l.pick === CUSTOM && (
                  <Input
                    autoFocus
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
                  {UNITS.map((u) => (
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
        <Button variant="ghost" className="mt-3" onClick={() => setLines([...lines, emptyLine()])}>
          <Plus size={16} /> {a.addLine}
        </Button>
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
