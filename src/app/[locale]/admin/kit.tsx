"use client";

import { useCallback, useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { X } from "lucide-react";

// Small form and list helpers shared by the admin sections only.

// 16px text on phones so iOS does not zoom into a focused field.
const control =
  "rounded-xl border border-line bg-panel-2 px-3 py-2.5 text-base text-silver outline-none transition focus:border-olive sm:py-2 sm:text-sm";

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
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-display text-3xl text-gold">{title}</h1>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function Panel({ title, actions, children, className = "" }: { title?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`mb-5 rounded-xl border border-line bg-panel p-5 sm:p-6 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="font-display text-lg text-gold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

// Table with gold uppercase headers; scrolls sideways on small screens.
export function Table({ head, children }: { head: ReactNode[]; children: ReactNode }) {
  return (
    <div className="-mx-5 overflow-x-auto sm:-mx-6">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th
                key={i}
                className="border-b border-line px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gold first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_td]:border-b [&_td]:border-line [&_td]:px-4 [&_td]:py-3 [&_td:first-child]:pl-5 [&_td:last-child]:pr-5 sm:[&_td:first-child]:pl-6 sm:[&_td:last-child]:pr-6 [&_tr:hover]:bg-gold/5">
          {children}
        </tbody>
      </table>
    </div>
  );
}

export function EmptyRow({ cols, children }: { cols: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={cols} className="text-center text-silver-dim">
        {children}
      </td>
    </tr>
  );
}

export function StatCard({
  icon,
  value,
  label,
  active,
  onClick,
}: {
  icon: ReactNode;
  value: ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`rounded-xl border bg-panel p-5 text-center transition enabled:hover:border-gold/60 ${
        active ? "border-gold" : "border-line"
      }`}
    >
      <div className="mb-2 flex justify-center text-gold">{icon}</div>
      <div className="font-display text-3xl font-semibold text-gold">{value}</div>
      <div className="mt-1 text-[13px] text-silver-dim">{label}</div>
    </button>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    // A sheet from the bottom on phones, a centred dialog on larger screens.
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-line bg-panel p-5 pb-8 sm:max-h-[88vh] sm:rounded-2xl sm:p-8 ${wide ? "max-w-3xl" : "max-w-lg"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h3 className="font-display text-xl text-gold">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="text-silver-dim hover:text-gold">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ModalActions({ children }: { children: ReactNode }) {
  return <div className="mt-6 flex flex-wrap justify-end gap-2">{children}</div>;
}

export function IconButton({ danger, className = "", ...props }: ComponentProps<"button"> & { danger?: boolean }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-md border p-1.5 transition disabled:opacity-40 ${
        danger
          ? "border-red-900 bg-red-950/60 text-red-300 hover:bg-red-900/60"
          : "border-line text-silver hover:border-gold hover:text-gold"
      } ${className}`}
    />
  );
}

export type Tone = "amber" | "sky" | "olive" | "green" | "red" | "gray";

export const toneClass: Record<Tone, string> = {
  amber: "border-amber-700/70 bg-amber-950/70 text-amber-300",
  sky: "border-sky-800/70 bg-sky-950/70 text-sky-300",
  olive: "border-olive/70 bg-olive/20 text-olive-light",
  green: "border-emerald-800/70 bg-emerald-950/70 text-emerald-300",
  red: "border-red-900/70 bg-red-950/70 text-red-300",
  gray: "border-line bg-panel-2 text-silver-dim",
};

const dotClass: Record<Tone, string> = {
  amber: "bg-amber-400",
  sky: "bg-sky-400",
  olive: "bg-olive-light",
  green: "bg-emerald-400",
  red: "bg-red-400",
  gray: "bg-silver-dim",
};

// Coloured status badge that opens a menu to change the status in place.
export function StatusMenu<T extends string>({
  value,
  options,
  label,
  tone,
  onChange,
  disabled,
}: {
  value: T;
  options: readonly T[];
  label: (v: T) => string;
  tone: (v: T) => Tone;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  // Fixed position so the menu is not clipped by a scrolling table.
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const open = pos !== null;

  useEffect(() => {
    if (!open) return;
    const close = () => setPos(null);
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setPos(open ? null : { top: r.bottom + 4, left: Math.min(r.left, window.innerWidth - 176) });
        }}
        className={`whitespace-nowrap rounded-md border px-2.5 py-1 text-xs font-medium transition hover:brightness-125 disabled:cursor-default ${toneClass[tone(value)]}`}
      >
        {label(value)} {!disabled && "▾"}
      </button>
      {open && (
        <div
          style={pos}
          className="fixed z-[70] min-w-40 overflow-hidden rounded-lg border border-line bg-panel-2 shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
        >
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                setPos(null);
                if (opt !== value) onChange(opt);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition ${
                opt === value ? "bg-gold/15 text-gold" : "text-silver hover:bg-panel"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${dotClass[tone(opt)]}`} />
              {label(opt)}
              {opt === value && <span className="ml-auto">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Badge({ children, tone = "gray" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-md border px-2.5 py-1 text-xs font-medium ${toneClass[tone]}`}>
      {children}
    </span>
  );
}

export function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null;
  return <p className="my-4 rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">{error}</p>;
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
