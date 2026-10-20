"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { keyEmail, normalizeKey } from "@/lib/client-key";
import type { Dictionary, Locale } from "@/i18n";

const input =
  "w-full rounded-xl border border-line bg-ink px-4 py-3 text-white outline-none transition focus:border-olive";

// Clients sign in with their access key only; the team with e-mail and password.
export function LoginForm({
  locale,
  labels,
  keyOnly,
}: {
  locale: Locale;
  labels: Dictionary["login"];
  keyOnly?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(isSupabaseConfigured ? null : labels.notConfigured);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isSupabaseConfigured) return;
    setPending(true);
    const form = new FormData(e.currentTarget);
    const key = normalizeKey(String(form.get("key") ?? ""));
    const { error } = await createClient().auth.signInWithPassword(
      keyOnly
        ? { email: await keyEmail(key), password: key }
        : { email: String(form.get("email")), password: String(form.get("password")) },
    );
    setPending(false);
    if (error) return setError(keyOnly ? labels.keyError : labels.error);

    // Only allow redirects inside the app.
    const next = new URLSearchParams(window.location.search).get("next") ?? "";
    router.replace(next.startsWith("/") && !next.startsWith("//") ? next : `/${locale}/dashboard/`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {keyOnly ? (
        <label className="block space-y-1.5">
          <span className="text-sm text-silver-dim">{labels.key}</span>
          <input
            name="key"
            required
            autoFocus
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="XXXX-XXXX-XXXX"
            className={`${input} text-center font-mono text-lg uppercase tracking-widest`}
          />
        </label>
      ) : (
        <>
          <label className="block space-y-1.5">
            <span className="text-sm text-silver-dim">{labels.email}</span>
            <input name="email" type="email" autoComplete="email" required className={input} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm text-silver-dim">{labels.password}</span>
            <input name="password" type="password" autoComplete="current-password" required className={input} />
          </label>
        </>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button type="submit" disabled={pending || !isSupabaseConfigured} className="w-full">
        {labels.submit}
      </Button>
    </form>
  );
}
