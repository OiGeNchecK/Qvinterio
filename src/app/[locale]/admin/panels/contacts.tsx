"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { Button } from "@/components/button";
import { createClient } from "@/lib/supabase/client";
import type { Dictionary } from "@/i18n";
import { Badge, Empty, ErrorNote, Field, Input, SectionHeader, Select, Textarea, emptyToNull, must, useLoad } from "../kit";
import { CONTACT_TYPES, type ContactType } from "../data";

type Contact = {
  id: string;
  type: ContactType;
  company: string | null;
  person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
};

const blank = { type: "supplier_material" as ContactType, company: "", person: "", phone: "", email: "", address: "", notes: "" };

export function ContactsSection({ t }: { t: Dictionary }) {
  const a = t.adminUi;
  const { data, error, reload } = useLoad(async () =>
    must<Contact[]>(
      await createClient()
        .from("contacts")
        .select("id, type, company, person, phone, email, address, notes")
        .order("company"),
    ),
  );
  const [typeFilter, setTypeFilter] = useState<"" | ContactType>("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Contact | "new" | null>(null);

  const q = query.trim().toLowerCase();
  const contacts = (data ?? []).filter(
    (c) =>
      (!typeFilter || c.type === typeFilter) &&
      (!q || [c.company, c.person, c.phone, c.email].some((v) => v?.toLowerCase().includes(q))),
  );

  return (
    <div className="space-y-6">
      <SectionHeader title={t.admin.sections.contacts}>
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={a.search} className="w-44" />
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as ContactType)} className="w-auto">
          <option value="">{a.allTypes}</option>
          {CONTACT_TYPES.map((type) => (
            <option key={type} value={type}>
              {a.contactType[type]}
            </option>
          ))}
        </Select>
        <Button onClick={() => setEditing("new")}>+ {a.newContact}</Button>
      </SectionHeader>
      <ErrorNote error={error} />

      {editing && (
        <ContactForm
          t={t}
          contact={editing === "new" ? null : editing}
          onClose={() => {
            setEditing(null);
            reload();
          }}
        />
      )}

      <Card className="p-0">
        {data && !contacts.length ? (
          <Empty>{a.noContacts}</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {contacts.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setEditing(c)}
                  className="grid w-full gap-2 px-5 py-4 text-left text-sm hover:bg-panel-2/60 sm:grid-cols-[1.4fr_1fr_1.4fr_auto] sm:items-center"
                >
                  <span>
                    <span className="block text-white">{c.company || c.person}</span>
                    {c.company && c.person && <span className="text-xs text-silver-dim">{c.person}</span>}
                  </span>
                  <span className="text-silver">{c.phone}</span>
                  <span className="truncate text-silver-dim">{c.email}</span>
                  <Badge tone="dim">{a.contactType[c.type]}</Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function ContactForm({ t, contact, onClose }: { t: Dictionary; contact: Contact | null; onClose: () => void }) {
  const a = t.adminUi;
  const [form, setForm] = useState(
    contact
      ? {
          type: contact.type,
          company: contact.company ?? "",
          person: contact.person ?? "",
          phone: contact.phone ?? "",
          email: contact.email ?? "",
          address: contact.address ?? "",
          notes: contact.notes ?? "",
        }
      : blank,
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });

  async function save() {
    if (!form.company.trim() && !form.person.trim()) return setError(a.nameRequired);
    setBusy(true);
    const row = {
      type: form.type,
      company: emptyToNull(form.company),
      person: emptyToNull(form.person),
      phone: emptyToNull(form.phone),
      email: emptyToNull(form.email),
      address: emptyToNull(form.address),
      notes: emptyToNull(form.notes),
    };
    const contacts = createClient().from("contacts");
    const { error } = contact ? await contacts.update(row).eq("id", contact.id) : await contacts.insert(row);
    setBusy(false);
    if (error) return setError(error.message);
    onClose();
  }

  async function remove() {
    if (!contact || !window.confirm(a.confirmDelete)) return;
    const { error } = await createClient().from("contacts").delete().eq("id", contact.id);
    if (error) return setError(error.message);
    onClose();
  }

  return (
    <Card className="grid gap-4 sm:grid-cols-2">
      <Field label={a.type}>
        <Select value={form.type} onChange={set("type")}>
          {CONTACT_TYPES.map((type) => (
            <option key={type} value={type}>
              {a.contactType[type]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={a.company}>
        <Input value={form.company} onChange={set("company")} />
      </Field>
      <Field label={a.person}>
        <Input value={form.person} onChange={set("person")} />
      </Field>
      <Field label={a.phone}>
        <Input type="tel" value={form.phone} onChange={set("phone")} />
      </Field>
      <Field label={a.email}>
        <Input type="email" value={form.email} onChange={set("email")} />
      </Field>
      <Field label={a.address}>
        <Input value={form.address} onChange={set("address")} />
      </Field>
      <Field label={a.notes} className="sm:col-span-2">
        <Textarea value={form.notes} onChange={set("notes")} />
      </Field>
      <div className="flex flex-wrap gap-3 sm:col-span-2">
        <Button onClick={save} disabled={busy}>
          {a.save}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          {a.cancel}
        </Button>
        {contact && (
          <Button variant="ghost" onClick={remove} className="ml-auto">
            {a.delete}
          </Button>
        )}
      </div>
      <div className="sm:col-span-2">
        <ErrorNote error={error} />
      </div>
    </Card>
  );
}
