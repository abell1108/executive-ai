"use client";

import { useEffect, useState } from "react";

/** Tailwind `lg` default: 1024px. */
export const LG_UP_QUERY = "(min-width: 1024px)";

/**
 * Subscribe to a CSS media query.
 * Returns `null` until mounted so SSR / first paint can avoid layout flash.
 */
export function useMediaQuery(query: string): boolean | null {
  const [matches, setMatches] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const apply = () => setMatches(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [query]);

  return matches;
}

/** `true` when viewport is Tailwind `lg` and up (≥1024px). */
export function useIsLgUp(): boolean | null {
  return useMediaQuery(LG_UP_QUERY);
}
