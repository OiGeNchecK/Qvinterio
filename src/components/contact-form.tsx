"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { Button } from "./button";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { company } from "@/content/company";
import type { Dictionary, Locale } from "@/i18n";

const input =
  "w-full rounded-xl border border-line bg-ink/80 px-4 py-3 text-base text-white outline-none transition placeholder:text-silver-dim/60 focus:border-olive";

// Contact form on the homepage. Messages land in public.contact_requests and
// show up in the admin panel under "Anfragen".
export function ContactForm({ locale, t }: { locale: Locale; t: Dictionary }) {
  const f = t.contactForm;
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const text = (key: string) => String(form.get(key) ?? "").trim();
    // Hidden field that only bots fill in.
    if (text("website")) return setState("sent");
    if (!isSupabaseConfigured) return setError(f.error);

    setState("sending");
    setError(null);
    const { error: e2 } = await createClient()
      .from("contact_requests")
      .insert({
        name: text("name"),
        company: text("company") || null,
        email: text("email"),
        phone: text("phone") || null,
        message: text("message"),
        locale,
      });
    if (e2) {
      setState("idle");
      return setError(e2.message.includes("too many") ? f.tooMany : f.error);
    }
    setState("sent");
  }

  if (state === "sent") {
    return (
      <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-line bg-ink/60 p-8 text-center">
        <CheckCircle2 size={40} className="text-olive-light" />
        <h3 className="mt-4 font-display text-2xl text-white">{f.sentTitle}</h3>
        <p className="mt-2 max-w-sm text-silver-dim">{f.sentText}</p>
        <button type="button" onClick={() => setState("idle")} className="mt-6 text-sm text-olive-light hover:underline">
          {f.another}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <Field label={f.name} required>
        <input name="name" autoComplete="name" required maxLength={200} className={input} />
      </Field>
      <Field label={f.company}>
        <input name="company" autoComplete="organization" maxLength={200} className={input} />
      </Field>
      <Field label={f.email} required>
        <input name="email" type="email" autoComplete="email" required maxLength={320} className={input} />
      </Field>
      <Field label={f.phone}>
        <input name="phone" type="tel" autoComplete="tel" maxLength={60} className={input} />
      </Field>
      <Field label={f.message} required className="sm:col-span-2">
        <textarea
          name="message"
          required
          rows={5}
          maxLength={5000}
          placeholder={f.messagePlaceholder}
          className={`${input} resize-y`}
        />
      </Field>
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

      <label className="flex items-start gap-3 text-sm text-silver-dim sm:col-span-2">
        <input type="checkbox" required className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-olive)]" />
        <span>
          {f.consentBefore}
          <Link href={`/${locale}/datenschutz/`} className="text-olive-light hover:underline">
            {f.consentLink}
          </Link>
          {f.consentAfter}
        </span>
      </label>

      {error && (
        <p className="text-sm text-red-400 sm:col-span-2">
          {error}{" "}
          <a href={`mailto:${company.email}`} className="underline">
            {company.email}
          </a>
          .
        </p>
      )}

      <div className="sm:col-span-2">
        <Button type="submit" disabled={state === "sending"} className="w-full sm:w-auto sm:px-8">
          <Send size={16} /> {state === "sending" ? f.sending : f.send}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  className = "",
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="text-sm text-silver-dim">
        {label}
        {required && <span className="text-gold"> *</span>}
      </span>
      {children}
    </label>
  );
}
