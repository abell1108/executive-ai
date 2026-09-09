"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type UseLiveRefreshOptions = {
  /** Light poll while mounted. Default 4 minutes. Pass 0 / null to disable. */
  intervalMs?: number | null;
  refreshOnFocus?: boolean;
  refreshOnVisible?: boolean;
  /** Skip focus/visibility/poll when false (manual refresh() still works). Default true. */
  enabled?: boolean;
  /** Debounce window so focus + visibility don't double-fire. Default 2.5s. */
  debounceMs?: number;
};

export type UseLiveRefreshResult = {
  refresh: () => void;
  lastRefreshedAt: number | null;
  refreshing: boolean;
};

const DEFAULT_INTERVAL_MS = 4 * 60 * 1000;
const DEFAULT_DEBOUNCE_MS = 2500;

/**
 * Live re-fetch helper for desk panels / home:
 * - optional light poll while mounted
 * - window focus + document visibility (when becoming visible)
 * - debounce so focus+visibility don't double-fire
 * - expose refresh() + lastRefreshedAt for a Refresh control
 *
 * Does not run the initial load — callers keep their mount/status effect.
 */
export function useLiveRefresh(
  onRefresh: () => void | Promise<void>,
  options: UseLiveRefreshOptions = {},
): UseLiveRefreshResult {
  const {
    intervalMs = DEFAULT_INTERVAL_MS,
    refreshOnFocus = true,
    refreshOnVisible = true,
    enabled = true,
    debounceMs = DEFAULT_DEBOUNCE_MS,
  } = options;

  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const lastFireRef = useRef(0);
  const inFlightRef = useRef(false);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const debounceRef = useRef(debounceMs);
  debounceRef.current = debounceMs;

  const runRefresh = useCallback(async (opts?: { force?: boolean }) => {
    const force = opts?.force === true;
    if (!force && !enabledRef.current) return;
    const now = Date.now();
    if (!force && now - lastFireRef.current < debounceRef.current) return;
    if (inFlightRef.current) return;
    lastFireRef.current = now;
    inFlightRef.current = true;
    setRefreshing(true);
    try {
      await onRefreshRef.current();
      setLastRefreshedAt(Date.now());
    } catch {
      setLastRefreshedAt(Date.now());
    } finally {
      inFlightRef.current = false;
      setRefreshing(false);
    }
  }, []);

  const refresh = useCallback(() => {
    void runRefresh({ force: true });
  }, [runRefresh]);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    const onFocus = () => {
      if (!refreshOnFocus) return;
      void runRefresh();
    };

    const onVisibility = () => {
      if (!refreshOnVisible) return;
      if (document.visibilityState === "visible") {
        void runRefresh();
      }
    };

    if (refreshOnFocus) {
      window.addEventListener("focus", onFocus);
    }
    if (refreshOnVisible) {
      document.addEventListener("visibilitychange", onVisibility);
    }

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, refreshOnFocus, refreshOnVisible, runRefresh]);

  useEffect(() => {
    if (!enabled) return;
    if (intervalMs == null || intervalMs <= 0) return;
    if (typeof window === "undefined") return;

    const id = window.setInterval(() => {
      void runRefresh();
    }, intervalMs);

    return () => {
      window.clearInterval(id);
    };
  }, [enabled, intervalMs, runRefresh]);

  return { refresh, lastRefreshedAt, refreshing };
}

/** Compact “Updated …” label for status lines. */
export function formatUpdatedAt(ts: number | null | undefined): string | null {
  if (ts == null) return null;
  const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (sec < 8) return "Updated just now";
  if (sec < 60) return `Updated ${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `Updated ${min}m ago`;
  const hr = Math.floor(min / 60);
  return `Updated ${hr}h ago`;
}
