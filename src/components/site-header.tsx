import Link from "next/link";
import { Logo } from "./logo";
import { LocaleSwitcher } from "./locale-switcher";
import { ButtonLink } from "./button";
import type { Dictionary, Locale } from "@/i18n";

const navLink =
  "rounded-full border border-line bg-panel/70 px-4 py-2 text-silver transition hover:border-olive hover:text-white";

// Header of the public website.
export function SiteHeader({ locale, t }: { locale: Locale; t: Dictionary }) {
  const home = `/${locale}/`;
  return (
    <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5">
      <Logo href={home} />
      <nav className="hidden gap-2 text-sm md:flex">
        <Link href={`${home}#works`} className={navLink}>{t.nav.works}</Link>
        <Link href={`/${locale}/leistungen/`} className={navLink}>{t.nav.services}</Link>
        <Link href={`${home}#contact`} className={navLink}>{t.nav.contact}</Link>
      </nav>
      <div className="flex items-center gap-3">
        <LocaleSwitcher />
        <ButtonLink href={`/${locale}/login/?for=team`} variant="ghost" className="px-3! text-xs! sm:px-5! sm:text-sm!">
          {t.nav.teamLogin}
        </ButtonLink>
      </div>
    </header>
  );
}
