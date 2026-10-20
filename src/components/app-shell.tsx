"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Globe } from "lucide-react";
import { Logo } from "./logo";
import { LocaleSwitcher } from "./locale-switcher";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/auth";
import type { Dictionary, Locale } from "@/i18n";

export type NavItem = { href: string; label: string };

// Frame for the private areas: admin, worker and client.
export function AppShell({
  locale,
  t,
  title,
  nav = [],
  children,
}: {
  locale: Locale;
  t: Dictionary;
  title: string;
  nav?: NavItem[];
  children: ReactNode;
}) {
  const user = useUser();
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.replace(`/${locale}/`);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-ink/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-4">
            <Logo href={`/${locale}/dashboard/`} size={32} />
            <span className="hidden text-sm text-silver-dim sm:inline">/ {title}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/${locale}/`}
              aria-label={t.adminUi.toWebsite}
              className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs hover:border-olive"
            >
              <Globe size={14} />
              <span className="hidden sm:inline">{t.adminUi.toWebsite}</span>
            </Link>
            <LocaleSwitcher />
            <div className="hidden text-right text-xs leading-tight md:block">
              <div className="text-silver">{user.fullName || user.email}</div>
              <div className="text-silver-dim">{user.roles.map((r) => t.roles[r]).join(", ")}</div>
            </div>
            <button
              onClick={signOut}
              className="rounded-full border border-line px-3 py-1.5 text-xs hover:border-olive"
            >
              {t.nav.logout}
            </button>
          </div>
        </div>
        {nav.length > 0 && (
          <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2 text-sm">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded-full px-3 py-1.5 text-silver-dim hover:bg-panel-2 hover:text-silver"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
