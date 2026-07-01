"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { worldCupStatus } from "@/lib/worldCup";
import { paletteAt } from "@/lib/festival";
import { LiveScoreTicker } from "@/components/festival/LiveScoreTicker";

/**
 * Global site banner rendered by layout.tsx — appears on every page.
 * Contains the brand wordmark, day line, live ticker, and bunting.
 */
export function SiteBanner() {
  const [dayLabel, setDayLabel] = useState("");

  useEffect(() => {
    const season = worldCupStatus();
    const date = new Date().toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    setDayLabel(season?.live ? `Match Day · ${date}` : date);
  }, []);

  return (
    <>
      <header className="masthead">
        <div className="mast-head">
          <Link href="/" className="mast-brand">
            Tu <span className="tp-2">Parea</span>
          </Link>
          <span className="mast-fest">The Fan Festival</span>
          <span className="mast-day">{dayLabel}</span>
        </div>
      </header>
      <LiveScoreTicker />
      <div className="bunting" aria-hidden="true">
        {Array.from({ length: 28 }, (_, i) => (
          <span key={i} className="flag" style={{ background: paletteAt(i) }} />
        ))}
      </div>
    </>
  );
}
