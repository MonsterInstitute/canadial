"use client";

import { useEffect, useState } from "react";
import { SLOGANS } from "@/lib/i18n";

// Shows one random slogan per page visit. It's picked once on mount and never
// changes while the user is on the page — a new visit/refresh picks another.
// (Starts deterministic for SSR, then randomizes on mount to avoid a hydration
// mismatch from calling Math.random() during render.)
export default function SloganRotator({ className = "" }: { className?: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(Math.floor(Math.random() * SLOGANS.length));
  }, []);

  return <span className={`block ${className}`}>{SLOGANS[index]}</span>;
}
