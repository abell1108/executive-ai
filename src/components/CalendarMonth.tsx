"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { buildMonthGrid, domainToPillKind } from "@/lib/seed-data";
import type { CalendarDay, CalendarPill, Domain, PillKind } from "@/lib/types";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const pillClass: Record<PillKind, string> = {
  corp: "bg-[rgba(27,54,68,0.08)] text-[rgba(27,54,68,0.55)] border border-[rgba(27,54,68,0.12)] font-medium",
  tpfi: "bg-[rgba(45,106,108,0.16)] text-teal",
  alo: "bg-navy text-white",
  rest: "bg-[#FDE8C8] text-alert-text",
};

const dotClass: Record<PillKind, string> = {
  corp: "bg-[rgba(27,54,68,0.35)]",
  tpfi: "bg-teal",
  alo: "bg-navy",
  rest: "bg-[#D97706]",
};

type LiveCalEvent = {
  id: string;
  title: string;
  meta: string;
  domain: Domain;
  start: string;
  end: string;
  allDay?: boolean;
};

type CalendarApiResponse = {
  source?: "live" | "seed";
  events?: LiveCalEvent[];
};

function shortLabel(title: string): string {
  const t = title.trim();
  if (t.length <= 12) return t;
  return t.slice(0, 11) + "…";
}

function eventDayOfMonth(ev: LiveCalEvent, year: number, monthIndex: number): number | null {
  let key: string;
  if (ev.allDay && /^\d{4}-\d{2}-\d{2}$/.test(ev.start)) {
    key = ev.start;
  } else {
    key = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(ev.start));
  }
  const [y, m, d] = key.split("-").map(Number);
  if (y !== year || m !== monthIndex + 1) return null;
  return d;
}

function mergeLiveEvents(
  base: CalendarDay[],
  events: LiveCalEvent[],
  year: number,
  monthIndex: number,
): CalendarDay[] {
  const byDay = new Map<number, { pills: CalendarPill[]; dots: PillKind[] }>();

  for (const ev of events) {
    const day = eventDayOfMonth(ev, year, monthIndex);
    if (day == null) continue;
    const kind = domainToPillKind(ev.domain);
    const bucket = byDay.get(day) ?? { pills: [], dots: [] };
    if (bucket.pills.length < 2) {
      bucket.pills.push({ label: shortLabel(ev.title), kind });
    }
    if (bucket.dots.length < 4) {
      bucket.dots.push(kind);
    }
    byDay.set(day, bucket);
  }

  return base.map((cell) => {
    if (cell.outOfMonth) return cell;
    const extra = byDay.get(cell.day);
    if (!extra) return cell;
    const pills = [...cell.pills, ...extra.pills].slice(0, 3);
    const dots = [...cell.dots, ...extra.dots].slice(0, 5);
    return { ...cell, pills, dots };
  });
}

export function CalendarMonth() {
  const { status } = useSession();
  const now = useMemo(() => new Date(), []);
  const [cursorDate, setCursorDate] = useState(
    () => new Date(now.getFullYear(), now.getMonth(), 1),
  );
  const [liveEvents, setLiveEvents] = useState<LiveCalEvent[] | null>(null);
  const [source, setSource] = useState<"live" | "seed">("seed");

  const year = cursorDate.getFullYear();
  const monthIndex = cursorDate.getMonth();

  const cursorLabel = useMemo(
    () =>
      cursorDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
    [cursorDate],
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/calendar", { cache: "no-store" });
        const data = (await res.json()) as CalendarApiResponse;
        if (cancelled) return;
        if (
          data.source === "live" &&
          Array.isArray(data.events) &&
          data.events.length > 0
        ) {
          setLiveEvents(data.events);
          setSource("live");
        } else {
          setLiveEvents(null);
          setSource("seed");
        }
      } catch {
        if (!cancelled) {
          setLiveEvents(null);
          setSource("seed");
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [status]);

  const cells = useMemo(() => {
    const base = buildMonthGrid(year, monthIndex);
    if (liveEvents && liveEvents.length > 0) {
      return mergeLiveEvents(base, liveEvents, year, monthIndex);
    }
    return base;
  }, [year, monthIndex, liveEvents]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-1.5 overflow-hidden">
      <div className="flex flex-shrink-0 flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-base font-bold tracking-tight text-navy sm:text-lg">
            {cursorLabel}
          </h3>
          <p className="mt-0.5 text-[10px] text-navy/55">
            {source === "live" ? "Live · Calendar" : "Demo"} · Month grid · dots
            & event pills · America/New_York
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5" aria-label="Month navigation">
          <button
            type="button"
            onClick={() =>
              setCursorDate(new Date(year, monthIndex - 1, 1))
            }
            className="rounded-[10px] border border-[rgba(27,54,68,0.12)] bg-white px-2.5 py-1.5 text-base font-medium text-navy shadow-sm hover:border-teal hover:text-teal"
            aria-label="Previous month"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() =>
              setCursorDate(new Date(now.getFullYear(), now.getMonth(), 1))
            }
            className="rounded-[10px] border border-[rgba(27,54,68,0.12)] bg-white px-3 py-1.5 text-xs font-semibold text-navy shadow-sm hover:border-teal hover:text-teal"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() =>
              setCursorDate(new Date(year, monthIndex + 1, 1))
            }
            className="rounded-[10px] border border-[rgba(27,54,68,0.12)] bg-white px-2.5 py-1.5 text-base font-medium text-navy shadow-sm hover:border-teal hover:text-teal"
            aria-label="Next month"
          >
            ›
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="mb-1 grid flex-shrink-0 grid-cols-7 gap-1 sm:gap-1.5">
          {DOW.map((d) => (
            <span
              key={d}
              className="py-0.5 text-center text-[9px] font-semibold tracking-wide text-navy/55 sm:text-[11px]"
            >
              {d}
            </span>
          ))}
        </div>

        <div
          className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 gap-[3px] overflow-hidden sm:gap-[5px]"
          role="grid"
          aria-label={cursorLabel}
        >
          {cells.map((cell, i) => (
            <div
              key={`${cell.day}-${i}`}
              className={
                cell.outOfMonth
                  ? "flex h-full min-h-0 flex-col gap-0.5 overflow-hidden rounded-[8px] border border-[rgba(27,54,68,0.08)] bg-[rgba(249,247,242,0.55)] px-1 py-0.5 sm:rounded-[10px] sm:px-1.5 sm:py-1"
                  : cell.isToday
                    ? "flex h-full min-h-0 flex-col gap-0.5 overflow-hidden rounded-[8px] border-2 border-teal bg-[#FFFEF8] px-1 py-0.5 shadow-[0_0_0_1px_rgba(45,106,108,0.12),0_2px_6px_rgba(45,106,108,0.1)] sm:rounded-[10px] sm:px-1.5 sm:py-1"
                    : "flex h-full min-h-0 flex-col gap-0.5 overflow-hidden rounded-[8px] border border-[rgba(27,54,68,0.14)] bg-[#FFFEF8] px-1 py-0.5 shadow-sm sm:rounded-[10px] sm:px-1.5 sm:py-1"
              }
            >
              {cell.isToday ? (
                <span className="grid h-[18px] w-[18px] place-items-center self-start rounded-full bg-teal text-[10px] font-bold text-white sm:h-[22px] sm:w-[22px] sm:text-[11px]">
                  {cell.day}
                </span>
              ) : (
                <span
                  className={
                    cell.outOfMonth
                      ? "self-start text-[10px] font-bold leading-none text-navy/30 sm:text-xs"
                      : "self-start text-[10px] font-bold leading-none text-navy sm:text-xs"
                  }
                >
                  {cell.day}
                </span>
              )}
              {cell.pills.slice(0, 3).map((p, pi) => (
                <span
                  key={`${p.label}-${p.kind}-${pi}`}
                  className={`block max-w-full flex-shrink-0 truncate rounded-full px-1 py-0.5 text-[7px] font-semibold leading-tight sm:px-1.5 sm:text-[8px] ${pillClass[p.kind]}`}
                >
                  {p.label}
                </span>
              ))}
              {cell.dots.length > 0 && (
                <div className="mt-auto flex flex-wrap gap-[3px] pt-0.5">
                  {cell.dots.map((d, di) => (
                    <i
                      key={di}
                      className={`block h-[5px] w-[5px] rounded-full ${dotClass[d]}`}
                      aria-hidden
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <p className="flex-shrink-0 pb-1 text-[10px] leading-snug text-navy/55 sm:text-[11px]">
        Teal = TPFI · Navy = ALO · Muted = Corporate · Amber = Rest
      </p>
    </div>
  );
}
