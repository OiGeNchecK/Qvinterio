"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
  Select,
  Table,
  Textarea,
  emptyToNull,
  must,
  useLoad,
} from "../kit";
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
  const [actionError, setActionError] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const contacts = (data ?? []).filter(
    (c) =>
      (!typeFilter || c.type === typeFilter) &&
      (!q || [c.company, c.person, c.phone, c.email].some((v) => v?.toLowerCase().includes(q))),
  );

  async function remove(c: Contact) {
    if (!window.confirm(a.confirmDelete)) return;
    const { error } = await createClient().from("contacts").delete().eq("id", c.id);
    setActionError(error?.message ?? null);
    reload();
  }

  return (
    <div>
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
        <Button onClick={() => setEditing("new")}>
          <Plus size={16} /> {a.newContact}
        </Button>
      </SectionHeader>
      <ErrorNote error={error ?? actionError} />

      <Panel>
        <Table head={[a.company, a.person, a.phone, a.email, a.type, ""]}>
          {contacts.map((c) => (
            <tr key={c.id}>
              <td className="font-medium text-white">{c.company ?? "—"}</td>
              <td className="text-silver">{c.person}</td>
              <td className="whitespace-nowrap">
                {c.phone && (
                  <a href={`tel:${c.phone}`} className="hover:text-gold">
                    {c.phone}
                  </a>
                )}
              </td>
              <td>
                {c.email && (
                  <a href={`mailto:${c.email}`} className="text-silver-dim hover:text-gold">
                    {c.email}
                  </a>
                )}
              </td>
              <td>
                <Badge>{a.contactType[c.type]}</Badge>
              </td>
              <td>
                <div className="flex justify-end gap-1.5">
                  <IconButton onClick={() => setEditing(c)} title={a.edit}>
                    <Pencil size={14} />
                  </IconButton>
                  <IconButton danger onClick={() => remove(c)} title={a.delete}>
                    <Trash2 size={14} />
                  </IconButton>
                </div>
              </td>
            </tr>
          ))}
          {data && !contacts.length && <EmptyRow cols={6}>{a.noContacts}</EmptyRow>}
        </Table>
      </Panel>

      {editing && (
        <ContactModal
          t={t}
          contact={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={reload}
        />
      )}
    </div>
  );
}

function ContactModal({
  t,
  contact,
  onClose,
  onSaved,
}: {
  t: Dictionary;
  contact: Contact | null;
  onClose: () => void;
  onSaved: () => void;
}) {
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
    onSaved();
    onClose();
  }

  return (
    <Modal title={contact ? a.editContact : a.newContact} onClose={onClose}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={a.type} className="sm:col-span-2">
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
        <Field label={a.address} className="sm:col-span-2">
          <Input value={form.address} onChange={set("address")} />
        </Field>
        <Field label={a.notes} className="sm:col-span-2">
          <Textarea value={form.notes} onChange={set("notes")} />
        </Field>
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
