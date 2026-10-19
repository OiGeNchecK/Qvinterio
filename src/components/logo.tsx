import Image from "next/image";
import Link from "next/link";
import { asset } from "@/lib/paths";

export function Logo({ href, size = 36 }: { href: string; size?: number }) {
  return (
    <Link href={href} className="flex items-center gap-3" aria-label="Qvinterio">
      <Image
        src={asset("/brand/emblem.webp")}
        alt=""
        width={size}
        height={size}
        className="rounded-full ring-1 ring-line"
        priority
      />
      <span className="hidden font-display text-xl font-semibold tracking-wide sm:inline">
        <span className="metal-text">qv</span>
        <span className="olive-text">interio</span>
      </span>
    </Link>
  );
}
