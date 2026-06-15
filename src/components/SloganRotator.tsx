"use client";

import { useEffect, useRef, useState } from "react";
import { SLOGANS } from "@/lib/i18n";

export default function SloganRotator({ className = "" }: { className?: string }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const fadeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Random starting slogan on each page load, then rotate every 4s.
    setIndex(Math.floor(Math.random() * SLOGANS.length));
    const interval = setInterval(() => {
      setVisible(false); // fade out
      fadeRef.current = setTimeout(() => {
        setIndex((p) => (p + 1) % SLOGANS.length);
        setVisible(true); // fade in next
      }, 400);
    }, 4000);
    return () => {
      clearInterval(interval);
      if (fadeRef.current) clearTimeout(fadeRef.current);
    };
  }, []);

  return (
    <span
      aria-live="polite"
      className={`block transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      } ${className}`}
    >
      {SLOGANS[index]}
    </span>
  );
}
