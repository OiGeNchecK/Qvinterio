"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { LocaleSwitcher } from "@/components/locale-switcher";
import type { Dictionary, Locale } from "@/i18n";
import { LoginForm } from "./login-form";

type Mode = "client" | "team" | "admin";

// The page is static, so the mode comes from ?for= in the browser.
function readMode(): Mode {
  const m = new URLSearchParams(window.location.search).get("for");
  return m === "client" || m === "admin" ? m : "team";
}
const noSubscribe = () => () => {};

// Login as a dialog over the site: the cross, Escape or a click outside
// the card returns to the homepage.
export function LoginDialog({ locale, t }: { locale: Locale; t: Dictionary }) {
  const router = useRouter();
  const mode = useSyncExternalStore(noSubscribe, readMode, () => "team" as Mode);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && router.push(`/${locale}/`);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [locale, router]);

  return (
    <div
      className="relative flex min-h-screen cursor-pointer items-center justify-center overflow-hidden bg-ink/90 px-4 backdrop-blur"
      onClick={(e) => e.target === e.currentTarget && router.push(`/${locale}/`)}
    >
      <div className="gold-arc pointer-events-none -left-1/2 top-1/3 h-[60rem] w-[200%] -rotate-6" />
      <div className="absolute right-4 top-4">
        <LocaleSwitcher />
      </div>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
        className="relative w-full max-w-sm cursor-auto rounded-3xl border border-line bg-panel/95 p-8 shadow-2xl"
      >
        <button
          type="button"
          onClick={() => router.push(`/${locale}/`)}
          aria-label={t.login.close}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-line text-silver-dim transition hover:border-olive hover:text-white"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <Logo href={`/${locale}/`} size={56} />
          <div>
            <h1 id="login-title" className="font-display text-2xl text-white">{t.login.titles[mode]}</h1>
            <p className="mt-1 text-sm text-silver-dim">{t.login.subtitles[mode]}</p>
          </div>
        </div>
        <LoginForm locale={locale} labels={t.login} />
      </div>
    </div>
  );
}
