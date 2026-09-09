"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { RULE_TAGS, WEEK_SUB, nextAloTargetIso } from "@/lib/seed-data";
import type { AgendaDay, AgendaEvent, Domain } from "@/lib/types";

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
  source?: "live" | "none";
  authenticated?: boolean;
  events?: LiveCalEvent[];
};

function useCountdown(iso: string) {
  const [label, setLabel] = useState("COUNTDOWN —");
  useEffect(() => {
    const tick = () => {
      const ms = new Date(iso).getTime() - Date.now();
      if (ms <= 0) {
        setLabel("NOW");
        return;
      }
      const d = Math.floor(ms / 86400000);
      const h = Math.floor((ms % 86400000) / 3600000);
      setLabel(`COUNTDOWN ${d}D ${h}H`);
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [iso]);
  return label;
}

/** YYYY-MM-DD for a Date in America/New_York. */
function nyDateKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function nyWeekdayShort(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
  }).format(d);
}

function nyMonthDay(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
  }).format(d);
}

/** Sunday–Saturday of the current week in America/New_York as date keys. */
function currentWeekKeysET(now = new Date()): string[] {
  const todayKey = nyDateKey(now);
  const [y, m, day] = todayKey.split("-").map(Number);
  const noonUtcApprox = new Date(Date.UTC(y, m - 1, day, 16, 0, 0));
  const dowName = nyWeekdayShort(noonUtcApprox);
  const dowMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dow = dowMap[dowName] ?? 0;
  const keys: string[] = [];
  for (let i = 0; i < 7; i++) {
    const offset = i - dow;
    const d = new Date(noonUtcApprox.getTime() + offset * 86400000);
    keys.push(nyDateKey(d));
  }
  return keys;
}

function weekSubtitle(weekKeys: string[]): string {
  if (weekKeys.length < 7) return WEEK_SUB;
  const start = new Date(weekKeys[0] + "T16:00:00Z");
  const end = new Date(weekKeys[6] + "T16:00:00Z");
  const a = nyMonthDay(start);
  const b = nyMonthDay(end);
  return `${a}–${b} · Domains only`;
}

function groupLiveIntoDays(
  events: LiveCalEvent[],
  weekKeys: string[],
  todayKey: string,
): AgendaDay[] {
  const byDay = new Map<string, AgendaEvent[]>();
  for (const key of weekKeys) byDay.set(key, []);

  for (const ev of events) {
    if (!ev.start) continue;
    const startDate = new Date(ev.start);
    const key =
      ev.allDay && /^\d{4}-\d{2}-\d{2}$/.test(ev.start)
        ? ev.start
        : nyDateKey(startDate);
    if (!byDay.has(key)) continue;

    const isAlo = ev.domain === "ALO";
    const list = byDay.get(key)!;
    list.push({
      title: ev.title,
      meta: ev.meta,
      domain: ev.domain,
      highlight: isAlo ? "alo" : undefined,
    });
  }

  const days: AgendaDay[] = [];
  for (const key of weekKeys) {
    const d = new Date(key + "T16:00:00Z");
    const dow = nyWeekdayShort(d);
    const eventsForDay = byDay.get(key) ?? [];
    if (eventsForDay.length === 0) continue;

    const hasAlo = eventsForDay.some((e) => e.highlight === "alo");
    days.push({
      label: `${dow} ${nyMonthDay(d)}`,
      dateKey: key,
      isToday: key === todayKey,
      countdown: hasAlo,
      events: eventsForDay,
    });
  }
  return days;
}

export function AgendaPanel({ domain }: { domain: Domain }) {
  const { status } = useSession();
  const [liveDays, setLiveDays] = useState<AgendaDay[]>([]);
  const [weekSub, setWeekSub] = useState(WEEK_SUB);
  const [source, setSource] = useState<"live" | "none" | "loading">("loading");
  const [authenticated, setAuthenticated] = useState(false);
  const [aloIso, setAloIso] = useState(nextAloTargetIso());
  const [showCountdown, setShowCountdown] = useState(false);
  const countdown = useCountdown(aloIso);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/calendar", { cache: "no-store" });
        const data = (await res.json()) as CalendarApiResponse;
        if (cancelled) return;

        const weekKeys = currentWeekKeysET();
        const todayKey = nyDateKey(new Date());
        setWeekSub(weekSubtitle(weekKeys));
        setAuthenticated(Boolean(data.authenticated));

        if (data.source === "live" && Array.isArray(data.events)) {
          const grouped = groupLiveIntoDays(data.events, weekKeys, todayKey);
          setLiveDays(grouped);
          setSource("live");

          const alo = data.events.find(
            (e) => e.domain === "ALO" || /alo|chapter/i.test(e.title),
          );
          if (alo?.start) {
            setAloIso(
              alo.allDay && /^\d{4}-\d{2}-\d{2}$/.test(alo.start)
                ? `${alo.start}T15:00:00.000Z`
                : new Date(alo.start).toISOString(),
            );
            setShowCountdown(true);
          } else {
            setShowCountdown(false);
          }
        } else {
          setLiveDays([]);
          setSource("none");
          setShowCountdown(false);
        }
      } catch {
        if (!cancelled) {
          setLiveDays([]);
          setSource("none");
          setAuthenticated(false);
          setShowCountdown(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [status]);

  const days = useMemo(() => {
    return liveDays
      .map((day) => ({
        ...day,
        events:
          domain === "All"
            ? day.events
            : day.events.filter((ev) => ev.domain === domain),
      }))
      .filter((day) => day.events.length > 0);
  }, [domain, liveDays]);

  const statusLabel =
    source === "loading"
      ? "Loading…"
      : source === "live"
        ? "Live · Domains"
        : authenticated
          ? "Live · Domains"
          : "Sign in";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <p className="mb-2 text-xs text-navy/55">
        {statusLabel} · {weekSub}
        {domain !== "All" ? ` · filter: ${domain}` : ""}
      </p>
      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto">
        {days.length === 0 && (
          <p className="rounded-xl border border-dashed border-[rgba(27,54,68,0.2)] bg-white px-3 py-4 text-sm text-navy/55">
            {source === "loading"
              ? "Loading domain agenda…"
              : source === "live" || authenticated
                ? `No domain agenda items${domain !== "All" ? ` for ${domain}` : ""} this week.`
                : "Sign in to load domain Calendar."}
          </p>
        )}
        {days.map((day) => (
          <div key={day.dateKey} className="mb-2.5">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-navy/55">
              {day.label}
              {day.isToday && (
                <span className="rounded-full bg-[rgba(45,106,108,0.15)] px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide text-teal">
                  Today
                </span>
              )}
              {day.countdown && showCountdown && (
                <span className="ml-auto rounded-full bg-alert-bg px-2 py-0.5 text-[10px] font-bold tracking-wide text-alert-text">
                  {countdown}
                </span>
              )}
            </div>
            {day.events.map((ev, i) => (
              <div
                key={`${ev.title}-${i}`}
                className={
                  ev.highlight === "alo"
                    ? "mb-1.5 rounded-xl border border-[rgba(180,83,9,0.2)] border-l-4 border-l-alert-text bg-alert-bg px-2.5 py-2 shadow-sm"
                    : "mb-1.5 rounded-xl border border-[rgba(27,54,68,0.12)] border-l-4 border-l-teal bg-white px-2.5 py-2 shadow-sm"
                }
              >
                <div
                  className={
                    ev.highlight === "alo"
                      ? "text-sm font-semibold text-alert-text"
                      : "text-sm font-semibold text-navy"
                  }
                >
                  {ev.title}
                </div>
                <div
                  className={
                    ev.highlight === "alo"
                      ? "mt-0.5 text-xs text-[rgba(180,83,9,0.75)]"
                      : "mt-0.5 text-xs text-navy/55"
                  }
                >
                  {ev.meta}
                  {ev.domain ? ` · ${ev.domain}` : ""}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-auto flex flex-wrap gap-2 pt-1.5">
        {RULE_TAGS.map((t) => (
          <span
            key={t}
            className="rounded-full border border-[rgba(27,54,68,0.12)] px-3 py-1.5 text-[11px] font-medium text-navy/55"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
