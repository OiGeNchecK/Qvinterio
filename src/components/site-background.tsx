"use client";

import { useSyncExternalStore } from "react";
import { GridScan } from "@/components/grid-scan";

const MOBILE_QUERY = "(max-width: 768px), (pointer: coarse)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(MOBILE_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

// Grid Scan room behind the whole page in the QV palette. It never takes
// clicks; a static CSS grid shows instead when WebGL2 is unavailable.
export function SiteBackground({ focus = "left" }: { focus?: "left" | "center" }) {
  const mobile = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false,
  );

  return (
    <div aria-hidden className="site-bg pointer-events-none fixed inset-0 bg-graphite">
      <div className="site-bg-fallback absolute inset-0" />
      <GridScan
        className="site-bg-scene"
        linesColor="#37372D"
        scanColor="#C4A46B"
        cells={mobile ? 6 : 8}
        depth={3}
        depthFade={0.7}
        parallax={mobile ? 0.3 : 0.45}
        points={!mobile}
        reflection={mobile ? 0 : 0.25}
        shading={0.5}
        scanDuration={7}
        scanDelay={4}
        scanWidth={1}
        trail={0.45}
        glow={mobile ? 0 : 0.35}
        interactive={!mobile}
        clickEffect="none"
        dpr={mobile ? 1 : 1.5}
      />
      {/* Darken behind the text so it stays readable. */}
      {focus === "left" ? (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_25%_40%,rgb(17_17_16/0.85),rgb(17_17_16/0.4)_60%,transparent_85%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(17_17_16/0.6),transparent_55%)]" />
        </>
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_32%_45%_at_50%_50%,rgb(17_17_16/0.7),rgb(17_17_16/0.25)_65%,transparent_100%)]" />
      )}
    </div>
  );
}
