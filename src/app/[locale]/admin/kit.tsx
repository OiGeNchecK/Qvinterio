"use client";

import { useCallback, useEffect, useState, type ComponentProps, type ReactNode } from "react";

// Small form and list helpers shared by the admin sections only.

const control =
  "rounded-xl border border-line bg-panel-2 px-3 py-2 text-sm text-silver outline-none transition focus:border-olive";

// Full width unless the caller sets its own width.
function controlClass(extra = "") {
  return `${control} ${/(^|\s)w-/.test(extra) ? "" : "w-full"} ${extra}`;
}

export function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="text-xs text-silver-dim">{label}</span>
      {children}
    </label>
  );
}

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={controlClass(props.className)} />;
}

export function Textarea(props: ComponentProps<"textarea">) {
  return <textarea rows={3} {...props} className={controlClass(props.className)} />;
}

export function Select(props: ComponentProps<"select">) {
  return <select {...props} className={controlClass(props.className)} />;
}

export function SectionHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-display text-3xl text-white">{title}</h1>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function Badge({ children, tone = "plain" }: { children: ReactNode; tone?: "plain" | "olive" | "gold" | "dim" }) {
  const tones = {
    plain: "border-line text-silver",
    olive: "border-olive/60 text-olive-light",
    gold: "border-gold/50 text-gold",
    dim: "border-line text-silver-dim",
  };
  return <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs ${tones[tone]}`}>{children}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-silver-dim">{children}</p>;
}

export function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null;
  return <p className="rounded-xl border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">{error}</p>;
}

// Loads data on mount and on reload(); keeps the last error for display.
export function useLoad<T>(load: () => PromiseLike<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.resolve(load()).then(
      (value) => active && (setData(value), setError(null)),
      (e: unknown) => active && setError(e instanceof Error ? e.message : String(e)),
    );
    return () => {
      active = false;
    };
    // load is recreated each render; reloads are driven by tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const reload = useCallback(() => setTick((n) => n + 1), []);
  return { data, error, reload };
}

// Throws the Supabase error so useLoad and forms can show it.
export function must<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

export function toDateInput(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

export function emptyToNull(value: string) {
  const v = value.trim();
  return v ? v : null;
}
