import Link from "next/link";
import type { ComponentProps } from "react";

const styles = {
  primary:
    "bg-gradient-to-b from-olive-light to-olive text-ink shadow-[0_0_24px_-8px_var(--color-gold)] hover:brightness-110",
  ghost: "border border-line text-silver hover:border-olive hover:text-white",
};

type Variant = keyof typeof styles;
const base =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition disabled:opacity-50";

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={`${base} ${styles[variant]} ${className}`} {...props} />;
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={`${base} ${styles[variant]} ${className}`} {...props} />;
}
