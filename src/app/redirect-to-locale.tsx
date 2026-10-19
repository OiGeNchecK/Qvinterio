"use client";

import { useEffect } from "react";
import Link from "next/link";
import { DEFAULT_LOCALE } from "@/i18n";
import { asset } from "@/lib/paths";

export function RedirectToLocale() {
  useEffect(() => {
    window.location.replace(asset(`/${DEFAULT_LOCALE}/`));
  }, []);
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Link href={`/${DEFAULT_LOCALE}/`} className="text-olive">Qvinterio →</Link>
    </div>
  );
}
