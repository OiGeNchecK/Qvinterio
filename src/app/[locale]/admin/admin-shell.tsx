"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  Building2,
  Contact,
  Images,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  ShoppingCart,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/auth";
import type { Dictionary, Locale } from "@/i18n";
import type { AdminSection } from "./sections";

const ICONS: Record<AdminSection | "overview", LucideIcon> = {
  overview: LayoutDashboard,
  orders: ShoppingCart,
  projects: Building2,
  contacts: Contact,
  users: Users,
  access: KeyRound,
  portfolio: Images,
};

// Admin frame with a fixed sidebar, modelled on the TinTei Beauty admin.
export function AdminShell({
  locale,
  t,
  sections,
  children,
}: {
  locale: Locale;
  t: Dictionary;
  sections: readonly AdminSection[];
  children: ReactNode;
}) {
  const user = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items = (["overview", ...sections] as const).map((key) => ({
    key,
    href: key === "overview" ? `/${locale}/admin/` : `/${locale}/admin/${key}/`,
    label: t.admin.sections[key],
    Icon: ICONS[key],
  }));
  const isActive = (href: string) => pathname.replace(/\/?$/, "/") === href;

  async function signOut() {
    await createClient().auth.signOut();
    router.replace(`/${locale}/`);
  }

  return (
    <div className="min-h-screen">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-ink/90 px-4 py-3 backdrop-blur lg:hidden">
        <Logo href={`/${locale}/admin/`} size={30} />
        <button
          onClick={() => setOpen(true)}
          aria-label="Menu"
          className="rounded-lg border border-line p-2 text-silver hover:border-gold hover:text-gold"
        >
          <Menu size={18} />
        </button>
      </header>

      {open && <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-line bg-panel transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="relative border-b border-line px-6 py-6 text-center">
          <div className="flex justify-center">
            <Logo href={`/${locale}/admin/`} size={36} />
          </div>
          <div className="mt-2 text-[10px] uppercase tracking-[0.4em] text-gold">{t.admin.title}</div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="absolute right-3 top-3 p-1 text-silver-dim hover:text-gold lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          {items.map(({ key, href, label, Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={key}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 border-r-[3px] px-6 py-3 text-sm transition ${
                  active
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-transparent text-silver-dim hover:border-gold hover:bg-gold/10 hover:text-gold"
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-line px-6 py-4 text-sm">
          <div className="font-semibold text-silver">{user.fullName || user.email}</div>
          <div className="text-[11px] uppercase tracking-wider text-gold">
            {user.roles.map((r) => t.roles[r]).join(", ")}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <button onClick={signOut} className="flex items-center gap-1.5 text-[13px] text-red-400 hover:underline">
              <LogOut size={14} /> {t.nav.logout}
            </button>
            <LocaleSwitcher />
          </div>
        </div>
      </aside>

      <main className="min-h-screen px-4 py-6 sm:px-8 sm:py-8 lg:ml-64">{children}</main>
    </div>
  );
}
