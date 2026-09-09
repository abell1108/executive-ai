"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type LiveCalEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
  domain?: string;
};

type CalendarApiResponse = {
  source?: "live" | "none";
  events?: LiveCalEvent[];
};

/** Hour in America/New_York (0–23). */
function etHour(iso: string): number | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      hour12: false,
    }).formatToParts(new Date(iso));
    const h = parts.find((p) => p.type === "hour")?.value;
    return h != null ? Number(h) % 24 : null;
  } catch {
    return null;
  }
}

function etDateKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

/**
 * Evening stack: 2+ timed domain events on the same ET day starting at/after 17:00.
 */
function hasEveningStack(events: LiveCalEvent[]): boolean {
  const byDay = new Map<string, number>();
  for (const ev of events) {
    if (!ev.start || ev.allDay) continue;
    if (!/T/.test(ev.start) && /^\d{4}-\d{2}-\d{2}$/.test(ev.start)) continue;
    const hour = etHour(ev.start);
    if (hour == null || hour < 17) continue;
    const key = etDateKey(ev.start);
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }
  for (const count of byDay.values()) {
    if (count >= 2) return true;
  }
  return false;
}

export function CollisionBanner() {
  const { status } = useSession();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/calendar", { cache: "no-store" });
        const data = (await res.json()) as CalendarApiResponse;
        if (cancelled) return;
        if (data.source === "live" && Array.isArray(data.events)) {
          setShow(hasEveningStack(data.events));
        } else {
          setShow(false);
        }
      } catch {
        if (!cancelled) setShow(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [status]);

  if (!show) return null;

  return (
    <div className="px-3 pt-3 sm:px-6 sm:pt-4">
      <div
        role="alert"
        className="flex min-h-[56px] items-start gap-2.5 rounded-[10px] border-2 border-[rgba(180,83,9,0.45)] border-l-8 border-l-alert-text bg-alert-bg px-3 py-3 text-alert-text shadow-[0_4px_14px_rgba(180,83,9,0.18)] sm:min-h-[64px] sm:items-center sm:gap-3.5 sm:px-5 sm:py-4"
      >
        <div
          className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-[rgba(180,83,9,0.22)] text-lg font-bold sm:h-9 sm:w-9 sm:text-xl"
          aria-hidden
        >
          ⚠
        </div>
        <p className="text-[11px] font-bold uppercase tracking-wide leading-snug sm:text-[13px]">
          <strong className="font-extrabold tracking-wider">HIGH COLLISION</strong>
          {" · "}
          Evening stack among domain events — protect after-5 capacity.
        </p>
      </div>
    </div>
  );
}
