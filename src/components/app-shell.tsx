import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "./logo";
import { LocaleSwitcher } from "./locale-switcher";
import { signOut } from "@/lib/auth-actions";
import { getDictionary } from "@/i18n";
import type { CurrentUser } from "@/lib/auth";

export type NavItem = { href: string; label: string };

// Frame for the private areas: admin, worker and client.
export async function AppShell({
  user,
  title,
  nav = [],
  children,
}: {
  user: CurrentUser;
  title: string;
  nav?: NavItem[];
  children: ReactNode;
}) {
  const { t } = await getDictionary();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-ink/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-4">
            <Logo href="/dashboard" size={32} />
            <span className="hidden text-sm text-silver-dim sm:inline">/ {title}</span>
          </div>
          <div className="flex items-center gap-3">
            <LocaleSwitcher />
            <div className="hidden text-right text-xs leading-tight md:block">
              <div className="text-silver">{user.fullName || user.email}</div>
              <div className="text-silver-dim">{user.roles.map((r) => t.roles[r]).join(", ")}</div>
            </div>
            <form action={signOut}>
              <button className="rounded-full border border-line px-3 py-1.5 text-xs hover:border-olive">
                {t.nav.logout}
              </button>
            </form>
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

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-line bg-panel/80 p-5 ${className}`}>{children}</div>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-panel-2">
      <div
        className="h-full rounded-full bg-gradient-to-r from-olive to-gold"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
