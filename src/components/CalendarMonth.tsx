"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { buildMonthGrid, domainToPillKind } from "@/lib/seed-data";
import type { CalendarDay, CalendarPill, Domain, PillKind } from "@/lib/types";
import {
  formatUpdatedAt,
  useLiveRefresh,
} from "@/hooks/useLiveRefresh";
import {
  useTriageOverlayMap,
  useTriageRemovedMap,
} from "@/hooks/useTriageStatus";
import { applyTriageOverlay } from "@/lib/triage-overlay";
import {
  DaySummaryModal,
  EventDetailModal,
  type ModalCalEvent,
  type ModalTriageItem,
} from "./EventDetailModal";
import { TriageDetailModal } from "./TriageDetailModal";
import { domainDisplayName } from "@/lib/domain-label";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const pillClass: Record<PillKind, string> = {
  corp: "bg-[rgba(27,54,68,0.08)] text-[rgba(27,54,68,0.55)] border border-[rgba(27,54,68,0.12)] font-medium",
  tpfi: "bg-[rgba(45,106,108,0.16)] text-teal",
  alo: "bg-navy text-white",
  rest: "bg-[#FDE8C8] text-alert-text",
};

/** Outlined amber mail pills — distinct from solid event pills. */
const triagePillClass =
  "border border-[#D97706] bg-[#FFF8EE] text-[#B45309] font-semibold";

const MAX_CELL_PILLS = 3;

const dotClass: Record<PillKind, string> = {
  corp: "bg-[rgba(27,54,68,0.35)]",
  tpfi: "bg-teal",
  alo: "bg-navy",
  rest: "bg-[#D97706]",
};

type LiveCalEvent = ModalCalEvent;

type LiveTriageItem = ModalTriageItem;

type CalendarApiResponse = {
  source?: "live" | "standing" | "none";
  authenticated?: boolean;
  events?: LiveCalEvent[];
};

type GmailApiResponse = {
  source?: "live" | "none";
  authenticated?: boolean;
  items?: LiveTriageItem[];
};

function shortLabel(title: string): string {
  const t = title.trim();
  if (t.length <= 12) return t;
  return t.slice(0, 11) + "…";
}

function nyDateKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function eventDayOfMonth(
  ev: LiveCalEvent,
  year: number,
  monthIndex: number,
): number | null {
  let key: string;
  if (ev.allDay && /^\d{4}-\d{2}-\d{2}$/.test(ev.start)) {
    key = ev.start;
  } else {
    key = nyDateKey(new Date(ev.start));
  }
  const [y, m, d] = key.split("-").map(Number);
  if (y !== year || m !== monthIndex + 1) return null;
  return d;
}

/** Parse Gmail Date header → America/New_York YYYY-MM-DD, or null. */
function triageDayKey(item: LiveTriageItem): string | null {
  const raw = item.date;
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return nyDateKey(parsed);
}

function triageDayOfMonth(
  item: LiveTriageItem,
  year: number,
  monthIndex: number,
): number | null {
  const key = triageDayKey(item);
  if (!key) return null;
  const [y, m, d] = key.split("-").map(Number);
  if (y !== year || m !== monthIndex + 1) return null;
  return d;
}


/** Visible month ± 7 days pad as ISO timeMin/timeMax (UTC approx for ET month). */
function monthQueryRange(year: number, monthIndex: number): {
  timeMin: string;
  timeMax: string;
} {
  const timeMin = new Date(Date.UTC(year, monthIndex, 1 - 7, 4, 0, 0));
  const timeMax = new Date(Date.UTC(year, monthIndex + 1, 1 + 7, 4, 0, 0));
  return { timeMin: timeMin.toISOString(), timeMax: timeMax.toISOString() };
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
    if (bucket.pills.length < 3) {
      bucket.pills.push({ label: shortLabel(ev.title), kind });
    }
    if (bucket.dots.length < 5) {
      bucket.dots.push(kind);
    }
    byDay.set(day, bucket);
  }

  return base.map((cell) => {
    if (cell.outOfMonth) return cell;
    const extra = byDay.get(cell.day);
    if (!extra) return { ...cell, pills: [], dots: [] };
    return { ...cell, pills: extra.pills, dots: extra.dots };
  });
}

function dayLabel(year: number, monthIndex: number, day: number): string {
  const d = new Date(Date.UTC(year, monthIndex, day, 16, 0, 0));
  return d.toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function CalendarMonth({ domain = "All" }: { domain?: Domain }) {
  const { status } = useSession();
  const now = useMemo(() => new Date(), []);
  const [cursorDate, setCursorDate] = useState(
    () => new Date(now.getFullYear(), now.getMonth(), 1),
  );
  const [liveEvents, setLiveEvents] = useState<LiveCalEvent[]>([]);
  const [triageItems, setTriageItems] = useState<LiveTriageItem[]>([]);
  const [source, setSource] = useState<"live" | "standing" | "none" | "loading">("loading");
  const [authenticated, setAuthenticated] = useState(false);

  const [detailEvent, setDetailEvent] = useState<LiveCalEvent | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [summaryDay, setSummaryDay] = useState<number | null>(null);
  const [summaryHighlightTriageId, setSummaryHighlightTriageId] = useState<
    string | null
  >(null);
  const [triageDetail, setTriageDetail] = useState<LiveTriageItem | null>(null);
  const removedMap = useTriageRemovedMap();
  const overlayMap = useTriageOverlayMap();

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

  const load = useCallback(async () => {
    try {
      const { timeMin, timeMax } = monthQueryRange(year, monthIndex);
      const calQs = new URLSearchParams({ timeMin, timeMax });
      const [calRes, mailRes] = await Promise.all([
        fetch(`/api/calendar?${calQs}`, {
          cache: "no-store",
          credentials: "same-origin",
        }),
        fetch("/api/gmail", {
          cache: "no-store",
          credentials: "same-origin",
        }),
      ]);
      const calData = (await calRes.json()) as CalendarApiResponse;
      const mailData = (await mailRes.json()) as GmailApiResponse;
      setAuthenticated(Boolean(calData.authenticated));
      const usable =
        (calData.source === "live" || calData.source === "standing") &&
        Array.isArray(calData.events);
      if (usable) {
        setLiveEvents(calData.events!);
        setSource(calData.source === "standing" ? "standing" : "live");
      } else {
        setLiveEvents([]);
        setSource("none");
      }
      if (mailData.source === "live" && Array.isArray(mailData.items)) {
        setTriageItems(mailData.items);
      } else {
        setTriageItems([]);
      }
    } catch {
      setLiveEvents([]);
      setTriageItems([]);
      setSource("none");
      setAuthenticated(false);
    }
  }, [year, monthIndex]);

  useEffect(() => {
    void load();
  }, [status, load]);

  const { refresh, lastRefreshedAt, refreshing } = useLiveRefresh(load, {
    intervalMs: 4 * 60 * 1000,
  });

  const updatedLabel = formatUpdatedAt(lastRefreshedAt);

  const filteredEvents = useMemo(
    () =>
      domain === "All"
        ? liveEvents
        : liveEvents.filter((ev) => ev.domain === domain),
    [domain, liveEvents],
  );

  const filteredTriage = useMemo(() => {
    const scoped =
      domain === "All"
        ? triageItems
        : triageItems.filter((item) => item.domain === domain);
    return scoped
      .filter((item) => !item.id || !(item.id in removedMap))
      .map((item) =>
        item.id && item.id in overlayMap
          ? applyTriageOverlay(item, overlayMap[item.id])
          : item,
      );
  }, [domain, triageItems, removedMap, overlayMap]);

  /** day → full LiveCalEvent[] for the visible month (domain-filtered). */
  const eventsByDay = useMemo(() => {
    const map = new Map<number, LiveCalEvent[]>();
    for (const ev of filteredEvents) {
      const day = eventDayOfMonth(ev, year, monthIndex);
      if (day == null) continue;
      const list = map.get(day) ?? [];
      list.push(ev);
      map.set(day, list);
    }
    return map;
  }, [filteredEvents, year, monthIndex]);

  /** day → triage items for the visible month (domain-filtered). */
  const triageByDay = useMemo(() => {
    const map = new Map<number, LiveTriageItem[]>();
    for (const item of filteredTriage) {
      const day = triageDayOfMonth(item, year, monthIndex);
      if (day == null) continue;
      const list = map.get(day) ?? [];
      list.push(item);
      map.set(day, list);
    }
    return map;
  }, [filteredTriage, year, monthIndex]);

  const cells = useMemo(() => {
    const base = buildMonthGrid(year, monthIndex);
    if (filteredEvents.length > 0) {
      return mergeLiveEvents(base, filteredEvents, year, monthIndex);
    }
    return base.map((cell) =>
      cell.outOfMonth ? cell : { ...cell, pills: [], dots: [] },
    );
  }, [year, monthIndex, filteredEvents]);

  const statusLabel =
    source === "loading"
      ? "Loading…"
      : source === "live"
        ? "Live · Roles"
        : source === "standing"
          ? "Standing ALO · Roles"
          : authenticated
            ? "Live · Roles"
            : "Sign in";

  const openEvent = (ev: LiveCalEvent) => {
    setSummaryDay(null);
    setDetailEvent(ev);
    setDetailOpen(true);
  };

  const openDaySummary = (day: number, highlightTriageId?: string | null) => {
    if (Number.isNaN(day)) return;
    setDetailOpen(false);
    setDetailEvent(null);
    setSummaryHighlightTriageId(highlightTriageId ?? null);
    setSummaryDay(day);
  };

  const openTriage = (_day: number, item: LiveTriageItem) => {
    setTriageDetail(item);
  };

  const openTriageDetail = (item: LiveTriageItem) => {
    setTriageDetail(item);
  };

  // Inbox triage for that day/domain: same calendar day + matching event domain
  const triageForDetail = useMemo(() => {
    if (!detailEvent) return [] as LiveTriageItem[];
    const day = eventDayOfMonth(detailEvent, year, monthIndex);
    if (day == null) return [];
    const dayItems = triageByDay.get(day) ?? [];
    return dayItems.filter((item) => item.domain === detailEvent.domain);
  }, [detailEvent, triageByDay, year, monthIndex]);

  const summaryEvents =
    summaryDay != null ? (eventsByDay.get(summaryDay) ?? []) : [];
  const summaryTriage =
    summaryDay != null ? (triageByDay.get(summaryDay) ?? []) : [];

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-1.5 overflow-hidden">
      <div className="flex flex-shrink-0 flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-base font-bold tracking-tight text-navy sm:text-lg">
            {cursorLabel}
          </h3>
          <p className="mt-0.5 text-[10px] text-navy/55">
            {statusLabel} · Month grid · event + triage pills
            {domain !== "All" ? ` · ${domainDisplayName(domain)}` : ""} · America/New_York
            {updatedLabel ? ` · ${updatedLabel}` : ""}
            {refreshing && !updatedLabel ? " · Refreshing…" : ""}
          </p>
        </div>
        <div className="inline-flex flex-wrap items-center gap-1.5" aria-label="Month navigation">
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
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            aria-label="Refresh calendar"
            className="inline-flex min-h-[32px] min-w-[44px] items-center justify-center gap-1.5 rounded-[10px] border border-[rgba(27,54,68,0.12)] bg-cream px-2.5 py-1.5 text-[11px] font-semibold text-navy shadow-sm hover:border-teal hover:text-teal disabled:opacity-60"
          >
            <span
              className={
                refreshing
                  ? "inline-block animate-spin text-teal"
                  : "inline-block text-teal"
              }
              aria-hidden
            >
              ↻
            </span>
            Refresh
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
          {cells.map((cell, i) => {
            const dayEvents = cell.outOfMonth
              ? []
              : (eventsByDay.get(cell.day) ?? []);
            const dayTriage = cell.outOfMonth
              ? []
              : (triageByDay.get(cell.day) ?? []);
            const hasTriage = dayTriage.length > 0;

            // Limit 2–3 pills; when triage exists, reserve ≥1 triage pill.
            let shownEvents: LiveCalEvent[] = [];
            let shownTriage: LiveTriageItem[] = [];
            if (hasTriage) {
              const eventSlots = Math.min(dayEvents.length, MAX_CELL_PILLS - 1);
              shownEvents = dayEvents.slice(0, eventSlots);
              shownTriage = dayTriage.slice(
                0,
                Math.min(dayTriage.length, MAX_CELL_PILLS - eventSlots),
              );
            } else {
              shownEvents = dayEvents.slice(0, MAX_CELL_PILLS);
            }
            const overflow =
              dayEvents.length +
              dayTriage.length -
              shownEvents.length -
              shownTriage.length;

            return (
              <div
                key={`${cell.day}-${i}`}
                role={cell.outOfMonth ? undefined : "button"}
                tabIndex={cell.outOfMonth ? undefined : 0}
                onClick={() => {
                  if (cell.outOfMonth) return;
                  openDaySummary(cell.day);
                }}
                onKeyDown={(e) => {
                  if (cell.outOfMonth) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openDaySummary(cell.day);
                  }
                }}
                className={
                  cell.outOfMonth
                    ? "flex h-full min-h-0 flex-col gap-0.5 overflow-hidden rounded-[8px] border border-[rgba(27,54,68,0.08)] bg-[rgba(249,247,242,0.55)] px-1 py-0.5 sm:rounded-[10px] sm:px-1.5 sm:py-1"
                    : cell.isToday
                      ? "flex h-full min-h-0 cursor-pointer flex-col gap-0.5 overflow-hidden rounded-[8px] border-2 border-teal bg-[#FFFEF8] px-1 py-0.5 shadow-[0_0_0_1px_rgba(45,106,108,0.12),0_2px_6px_rgba(45,106,108,0.1)] sm:rounded-[10px] sm:px-1.5 sm:py-1"
                      : "flex h-full min-h-0 cursor-pointer flex-col gap-0.5 overflow-hidden rounded-[8px] border border-[rgba(27,54,68,0.14)] bg-[#FFFEF8] px-1 py-0.5 shadow-sm hover:border-teal/50 sm:rounded-[10px] sm:px-1.5 sm:py-1"
                }
              >
                <div className="flex flex-shrink-0 items-center justify-between gap-0.5">
                  {cell.isToday ? (
                    <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-teal text-[10px] font-bold text-white sm:h-[22px] sm:w-[22px] sm:text-[11px]">
                      {cell.day}
                    </span>
                  ) : (
                    <span
                      className={
                        cell.outOfMonth
                          ? "text-[10px] font-bold leading-none text-navy/30 sm:text-xs"
                          : "text-[10px] font-bold leading-none text-navy sm:text-xs"
                      }
                    >
                      {cell.day}
                    </span>
                  )}
                  {overflow > 0 && (
                    <span
                      className="text-[7px] font-bold leading-none text-navy/45 sm:text-[8px]"
                      title={`${overflow} more`}
                    >
                      +{overflow}
                    </span>
                  )}
                </div>
                {shownEvents.map((ev) => {
                  const kind = domainToPillKind(ev.domain);
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEvent(ev);
                      }}
                      className={`block max-w-full flex-shrink-0 truncate rounded-full px-1 py-0.5 text-left text-[7px] font-semibold leading-tight hover:ring-1 hover:ring-teal/40 sm:px-1.5 sm:text-[8px] ${pillClass[kind]}`}
                      title={ev.title}
                    >
                      {shortLabel(ev.title)}
                    </button>
                  );
                })}
                {shownTriage.map((item, ti) => {
                  const tid = item.id ?? `${item.title}-${cell.day}-${ti}`;
                  return (
                    <button
                      key={tid}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openTriage(cell.day, item);
                      }}
                      className={`block max-w-full flex-shrink-0 truncate rounded-full px-1 py-0.5 text-left text-[7px] leading-tight hover:ring-1 hover:ring-[#D97706]/60 sm:px-1.5 sm:text-[8px] ${triagePillClass}`}
                      title={`Triage: ${item.title}`}
                      aria-label={`Inbox triage: ${item.title}`}
                    >
                      ✉ {shortLabel(item.title)}
                    </button>
                  );
                })}
                {cell.dots.length > 0 && shownEvents.length === 0 && shownTriage.length === 0 && (
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
            );
          })}
        </div>
      </div>

      {filteredEvents.length === 0 && source !== "loading" && (
        <p className="flex-shrink-0 rounded-lg border border-dashed border-[rgba(27,54,68,0.2)] bg-white px-2.5 py-2 text-[10px] text-navy/55 sm:text-[11px]">
          {source === "live" || source === "standing" || authenticated
            ? `No role calendar events${domain !== "All" ? ` for ${domainDisplayName(domain)}` : ""} this month.`
            : "Sign in to load Calendar."}
        </p>
      )}

      <p className="flex-shrink-0 pb-1 text-[10px] leading-snug text-navy/55 sm:text-[11px]">
        Teal = TPFI / DRSC / Myers / KB · Navy = ALO · Amber outline = inbox triage
      </p>

      <EventDetailModal
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetailEvent(null);
        }}
        event={detailEvent}
        triage={triageForDetail}
        onSelectTriage={openTriageDetail}
      />

      <DaySummaryModal
        open={summaryDay != null}
        onClose={() => {
          setSummaryDay(null);
          setSummaryHighlightTriageId(null);
        }}
        dayLabel={
          summaryDay != null
            ? dayLabel(year, monthIndex, summaryDay)
            : ""
        }
        events={summaryEvents}
        triage={summaryTriage}
        onSelectEvent={(ev) => openEvent(ev)}
        onSelectTriage={openTriageDetail}
        highlightTriageId={summaryHighlightTriageId}
      />

      <TriageDetailModal
        open={triageDetail != null}
        onClose={() => setTriageDetail(null)}
        item={triageDetail}
      />
    </div>
  );
}
