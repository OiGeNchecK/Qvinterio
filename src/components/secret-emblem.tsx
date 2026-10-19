"use client";

import Image from "next/image";
import { useRef } from "react";
import { useRouter } from "next/navigation";
import { asset } from "@/lib/paths";

const TAPS = 5;
const WINDOW_MS = 3000;

// The big emblem opens the admin login after five quick taps.
export function SecretEmblem({ locale }: { locale: string }) {
  const router = useRouter();
  const taps = useRef<number[]>([]);

  function onTap() {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < WINDOW_MS), now];
    if (taps.current.length >= TAPS) {
      taps.current = [];
      router.push(`/${locale}/login/?for=admin`);
    }
  }

  return (
    <div
      onClick={onTap}
      className="relative mx-auto aspect-square w-full max-w-md select-none rounded-full [-webkit-tap-highlight-color:transparent]"
    >
      <div className="absolute inset-0 rounded-full bg-gold/10 blur-3xl" />
      <Image
        src={asset("/brand/emblem.webp")}
        alt="Qvinterio"
        fill
        sizes="(min-width: 1024px) 28rem, 80vw"
        draggable={false}
        className="rounded-full object-cover ring-1 ring-line"
        priority
      />
    </div>
  );
}
