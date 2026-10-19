"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { homePathFor, Loading, useAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/logo";
import type { Dictionary, Locale } from "@/i18n";

// Sends each user to their area based on role.
export function Dashboard({ locale, t }: { locale: Locale; t: Dictionary }) {
  const auth = useAuth();
  const router = useRouter();
  const home = auth.status === "ready" ? homePathFor(auth.user) : null;

  useEffect(() => {
    if (auth.status === "anon") router.replace(`/${locale}/login/`);
    else if (home) router.replace(`/${locale}${home}`);
  }, [auth.status, home, locale, router]);

  if (auth.status !== "ready" || home) return <Loading />;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo href={`/${locale}/`} size={56} />
      <p className="max-w-md text-silver-dim">{t.common.noRole}</p>
      <button
        onClick={() => createClient().auth.signOut()}
        className="text-sm text-olive hover:underline"
      >
        {t.nav.logout}
      </button>
    </div>
  );
}
