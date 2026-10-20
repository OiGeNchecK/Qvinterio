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
import { CHANNEL_DEALERS, ORDER_CATEGORIES, type OrderCategory, type ProjectRef } from "../data";

type CatalogItem = {
  id: string;
  category: OrderCategory;
  subcategory: string | null;
  brand: string | null;
  channel: string | null;
  name: string;
  unit: string;
  active: boolean;
};

const CUSTOM = "__custom";
const UNITS = ["Stk", "m", "m²", "m³", "kg", "t", "Paket", "Rolle", "Sack", "Eimer", "Kanister", "Kartusche", "Palette", "Tag", "Woche"];
const PAGE = 1000;

// The catalog has more rows than one API page, so it is read page by page.
async function loadCatalog() {
  const items: CatalogItem[] = [];
  for (let from = 0; ; from += PAGE) {
    const page = must<CatalogItem[]>(
      await createClient()
        .from("catalog_items")
        .select("id, category, subcategory, brand, channel, name, unit, active")
        .order("category")
        .order("subcategory")
        .order("brand", { nullsFirst: false })
        .order("name")
        .range(from, from + PAGE - 1),
    );
    items.push(...page);
    if (page.length < PAGE) return items;
  }
}

export const itemLabel = (c: Pick<CatalogItem, "brand" | "name">) => (c.brand ? `${c.brand} ${c.name}` : c.name);

const distinct = (values: (string | null)[]) =>
  [...new Set(values.filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b, "de"));

type Filter = { group: string; brand: string; channel: string; query: string };
const emptyFilter: Filter = { group: "", brand: "", channel: "", query: "" };

function matches(c: CatalogItem, f: Filter) {
  const q = f.query.trim().toLowerCase();
  return (
    (!f.group || c.subcategory === f.group) &&
    (!f.brand || c.brand === f.brand) &&
    (!f.channel || c.channel === f.channel) &&
    (!q || `${c.brand ?? ""} ${c.name} ${c.subcategory ?? ""}`.toLowerCase().includes(q))
  );
}

// Warengruppe, Hersteller and search; each list only offers what the others leave.
function CatalogFilter({
  t,
  items,
  filter,
  onChange,
  channels,
}: {
  t: Dictionary;
  items: CatalogItem[];
  filter: Filter;
  onChange: (f: Filter) => void;
  channels?: boolean;
}) {
  const a = t.adminUi;
  const groups = distinct(items.filter((c) => matches(c, { ...filter, group: "" })).map((c) => c.subcategory));
  const brands = distinct(items.filter((c) => matches(c, { ...filter, brand: "" })).map((c) => c.brand));
  const channelList = distinct(items.filter((c) => matches(c, { ...filter, channel: "" })).map((c) => c.channel));
  return (
    <div className={`grid gap-2 ${channels ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
      <Select value={filter.group} onChange={(e) => onChange({ ...filter, group: e.target.value })} aria-label={a.group}>
        <option value="">{a.allGroups}</option>
        {groups.map((g) => (
          <option key={g}>{g}</option>
        ))}
      </Select>
      <Select value={filter.brand} onChange={(e) => onChange({ ...filter, brand: e.target.value })} aria-label={a.brand}>
        <option value="">{a.allBrands}</option>
        {brands.map((b) => (
          <option key={b}>{b}</option>
        ))}
      </Select>
      {channels && (
        <Select value={filter.channel} onChange={(e) => onChange({ ...filter, channel: e.target.value })} aria-label={a.channel}>
          <option value="">{a.allChannels}</option>
          {channelList.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
      )}
      <Input value={filter.query} onChange={(e) => onChange({ ...filter, query: e.target.value })} placeholder={a.search} />
    </div>
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
  const [filter, setFilter] = useState<Filter>(emptyFilter);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inCategory = (catalog.data ?? []).filter((c) => c.active && c.category === form.category);
  const options = inCategory.filter((c) => matches(c, filter));
  const optionGroups = new Map<string, CatalogItem[]>();
  for (const c of options) optionGroups.set(c.subcategory ?? "", [...(optionGroups.get(c.subcategory ?? "") ?? []), c]);
  const byId = new Map(catalog.data?.map((c) => [c.id, c]));
  const setLine = (i: number, patch: Partial<Line>) => setLines(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  async function save() {
    const items = lines
      .map((l) => {
        const item = l.pick && l.pick !== CUSTOM ? byId.get(l.pick) : undefined;
        return {
          catalog_item_id: item?.id ?? null,
          description: (item ? itemLabel(item) : l.text).trim(),
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
              setFilter(emptyFilter);
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

      {inCategory.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 text-xs text-silver-dim">{a.catalogFilter}</div>
          <CatalogFilter t={t} items={inCategory} filter={filter} onChange={setFilter} />
        </div>
      )}

      <div className="mt-6">
        <div className="mb-2 text-xs text-silver-dim">{a.items}</div>
        <div className="space-y-2">
          {lines.map((l, i) => (
            <div key={i} className="grid grid-cols-[1fr_5rem_6rem_auto] items-start gap-2">
              <div className="space-y-2">
                <Select value={l.pick} onChange={(e) => setLine(i, { pick: e.target.value })}>
                  <option value="">{a.pickItem}</option>
                  {l.pick && l.pick !== CUSTOM && !options.some((c) => c.id === l.pick) && byId.get(l.pick) && (
                    <option value={l.pick}>{itemLabel(byId.get(l.pick)!)}</option>
                  )}
                  {[...optionGroups].map(([group, items]) => (
                    <optgroup key={group} label={group || "—"}>
                      {items.map((c) => (
                        <option key={c.id} value={c.id}>
                          {itemLabel(c)}
                        </option>
                      ))}
                    </optgroup>
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
  const [form, setForm] = useState({ category: "material" as OrderCategory, subcategory: "", brand: "", name: "", unit: "Stk" });
  const [category, setCategory] = useState<"" | OrderCategory>("");
  const [filter, setFilter] = useState<Filter>(emptyFilter);
  const [actionError, setActionError] = useState<string | null>(null);

  async function run(action: PromiseLike<{ error: { message: string } | null }>) {
    const { error } = await action;
    setActionError(error?.message ?? null);
    reload();
  }

  const inCategory = (data ?? []).filter((c) => !category || c.category === category);
  const items = inCategory.filter((c) => matches(c, filter));
  const dealers = filter.channel && CHANNEL_DEALERS[filter.channel];

  return (
    <Modal title={a.catalog} onClose={onClose} wide>
      <p className="-mt-2 mb-4 text-sm text-silver-dim">{a.catalogHint}</p>
      <datalist id="catalog-groups">
        {distinct((data ?? []).map((c) => c.subcategory)).map((g) => (
          <option key={g} value={g} />
        ))}
      </datalist>
      <datalist id="catalog-brands">
        {distinct((data ?? []).map((c) => c.brand)).map((b) => (
          <option key={b} value={b} />
        ))}
      </datalist>
      <form
        className="grid gap-2 sm:grid-cols-[9rem_1fr_1fr] lg:grid-cols-[9rem_10rem_9rem_1fr_6rem_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.name.trim()) return;
          run(
            createClient()
              .from("catalog_items")
              .insert({
                ...form,
                name: form.name.trim(),
                subcategory: emptyToNull(form.subcategory),
                brand: emptyToNull(form.brand),
              }),
          );
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
        <Input
          list="catalog-groups"
          value={form.subcategory}
          onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
          placeholder={a.group}
        />
        <Input list="catalog-brands" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder={a.brand} />
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
            onClick={() => {
              setCategory(c);
              setFilter(emptyFilter);
            }}
            className={`rounded-md border px-2.5 py-1 text-xs transition ${
              category === c ? "border-gold bg-gold/15 text-gold" : "border-line text-silver-dim hover:border-gold/60"
            }`}
          >
            {c ? t.orderCategory[c] : a.allTypes}
          </button>
        ))}
      </div>
      <CatalogFilter t={t} items={inCategory} filter={filter} onChange={setFilter} channels />
      <div className="mb-3 mt-2 flex flex-wrap justify-between gap-2 text-xs text-silver-dim">
        <span>{dealers ? `${a.dealers}: ${dealers}` : ""}</span>
        <span>{a.catalogCount.replace("{n}", String(items.length))}</span>
      </div>
      <div className="px-6 sm:px-8">
        <Table head={[a.group, a.brand, a.name, a.unit, a.channel, a.visibility, ""]}>
          {items.map((c) => (
            <tr key={c.id}>
              <td className="text-silver-dim">{c.subcategory ?? t.orderCategory[c.category]}</td>
              <td className="text-silver">{c.brand ?? <span className="text-silver-dim">{a.noBrand}</span>}</td>
              <td className="text-white">{c.name}</td>
              <td className="text-silver-dim">{c.unit}</td>
              <td className="text-silver-dim" title={c.channel ? CHANNEL_DEALERS[c.channel] : undefined}>
                {c.channel}
              </td>
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
          {data && !items.length && <EmptyRow cols={7}>{a.catalogEmpty}</EmptyRow>}
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
