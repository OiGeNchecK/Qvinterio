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
      className="relative mx-auto aspect-square w-full max-w-md select-none [-webkit-tap-highlight-color:transparent] [perspective:1200px]"
    >
      {/* Soft shadow under the coin. */}
      <div className="absolute inset-x-[12%] -bottom-[6%] h-[12%] rounded-full bg-black/70 blur-2xl" />
      <div className="coin absolute inset-0 rounded-full">
        {/* Reeded metal rim. */}
        <div className="coin-rim absolute inset-0 rounded-full" />
        <div className="absolute inset-[5%] overflow-hidden rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.6),0_0_0_1px_rgb(238_232_222/0.15)]">
          <Image
            src={asset("/brand/emblem.webp")}
            alt="Qvinterio"
            fill
            sizes="(min-width: 1024px) 28rem, 80vw"
            draggable={false}
            className="scale-[1.04] object-cover"
            priority
          />
          <div className="coin-sheen absolute inset-0" />
        </div>
      </div>
    </div>
  );
}
