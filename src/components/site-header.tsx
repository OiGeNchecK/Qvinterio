import Link from "next/link";
import { Logo } from "./logo";
import { LocaleSwitcher } from "./locale-switcher";
import { ButtonLink } from "./button";
import { getDictionary } from "@/i18n";
import { getCurrentUser } from "@/lib/auth";

// Header of the public website.
export async function SiteHeader() {
  const [{ t }, user] = await Promise.all([getDictionary(), getCurrentUser()]);
  return (
    <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-4 py-5">
      <Logo />
      <nav className="hidden gap-8 text-sm text-silver-dim md:flex">
        <Link href="/#works" className="hover:text-silver">{t.nav.works}</Link>
        <Link href="/#services" className="hover:text-silver">{t.nav.services}</Link>
        <Link href="/#contact" className="hover:text-silver">{t.nav.contact}</Link>
      </nav>
      <div className="flex items-center gap-3">
        <LocaleSwitcher />
        {user ? (
          <ButtonLink href="/dashboard" variant="ghost">{t.nav.dashboard}</ButtonLink>
        ) : (
          <ButtonLink href="/login" variant="ghost">{t.nav.login}</ButtonLink>
        )}
      </div>
    </header>
  );
}
