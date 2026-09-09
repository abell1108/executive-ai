"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  formatUpdatedAt,
  useLiveRefresh,
} from "@/hooks/useLiveRefresh";
import { CollisionBanner } from "@/components/CollisionBanner";
import type { MobileTab } from "./MobileTabBar";
import type { MoreSubview } from "./MobileMore";

type GmailApiResponse = {
  source?: "live" | "none";
  items?: { domain?: string; title?: string }[];
};

type CalEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
  domain?: string;
  meta?: string;
};

type CalendarApiResponse = {
  source?: "live" | "standing" | "none";
  events?: CalEvent[];
};

function etDateKey(iso: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function todayKeyET(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function formatTimeET(iso: string): string {
  if (!/T/.test(iso) && /^\d{4}-\d{2}-\d{2}$/.test(iso)) return "All day";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function durationLabel(start: string, end: string, allDay?: boolean): string {
  if (allDay || (!/T/.test(start) && /^\d{4}-\d{2}-\d{2}$/.test(start))) {
    return "All day";
  }
  try {
    const ms = new Date(end).getTime() - new Date(start).getTime();
    if (!Number.isFinite(ms) || ms <= 0) return formatTimeET(start);
    const mins = Math.round(ms / 60000);
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  } catch {
    return formatTimeET(start);
  }
}

function etHour(iso: string): number | null {
  try {
    if (!/T/.test(iso) && /^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
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

function countEveningStacks(events: CalEvent[]): number {
  const byDay = new Map<string, number>();
  for (const ev of events) {
    if (!ev.start || ev.allDay) continue;
    const hour = etHour(ev.start);
    if (hour == null || hour < 17) continue;
    const key = etDateKey(ev.start);
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }
  let stacks = 0;
  for (const count of byDay.values()) {
    if (count >= 2) stacks += 1;
  }
  return stacks;
}

function LeafIcon() {
  return (
    <svg className="h-4 w-4 text-teal" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 3c4.5 2.2 7.5 6.2 7.5 11.2 0 2.4-.8 4.5-2.2 6.1-.4-3.4-2.3-6.3-5.3-8.1 1.6 2.4 2.4 5.1 2.4 7.9 0 1.3-.2 2.5-.6 3.6C10.2 22.3 6 18.8 6 13.5 6 8.6 8.9 4.8 12 3Z" />
    </svg>
  );
}

export function MobileHome({
  onNavigate,
}: {
  onNavigate: (tab: MobileTab, opts?: { more?: MoreSubview }) => void;
}) {
  const { status } = useSession();
  const [inboxCount, setInboxCount] = useState<number | null>(null);
  const [meetingsToday, setMeetingsToday] = useState<number | null>(null);
  const [collisionDays, setCollisionDays] = useState(0);
  const [focusTitle, setFocusTitle] = useState<string | null>(null);
  const [focusSub, setFocusSub] = useState<string | null>(null);
  const [upcoming, setUpcoming] = useState<
    { id: string; title: string; meta: string; badge: string }[]
  >([]);
  const [calKnown, setCalKnown] = useState(false);

  const load = useCallback(async () => {
    try {
      const [gmailRes, calRes] = await Promise.all([
        fetch("/api/gmail", { cache: "no-store" }),
        fetch("/api/calendar", { cache: "no-store" }),
      ]);
      const gmail = (await gmailRes.json()) as GmailApiResponse;
      const cal = (await calRes.json()) as CalendarApiResponse;

      if (gmail.source === "live" && Array.isArray(gmail.items)) {
        setInboxCount(gmail.items.length);
      } else {
        setInboxCount(null);
      }

      const events = Array.isArray(cal.events) ? cal.events : [];
      if (cal.source === "live" || cal.source === "standing") {
        setCalKnown(true);
        const today = todayKeyET();
        const todayEvents = events
          .filter((e) => e.start && etDateKey(e.start) === today)
          .sort((a, b) => a.start.localeCompare(b.start));
        setMeetingsToday(todayEvents.length);
        setCollisionDays(countEveningStacks(events));

        const aloToday = todayEvents.find(
          (e) => /alo/i.test(e.title || "") || e.domain === "ALO",
        );
        if (aloToday) {
          setFocusTitle(
            /chapter/i.test(aloToday.title)
              ? "ALO Chapter prep"
              : aloToday.title.length > 36
                ? `${aloToday.title.slice(0, 34)}…`
                : aloToday.title,
          );
          setFocusSub(
            aloToday.meta ||
              "Leadership offsite deck · Key insights & speakers",
          );
        } else if (todayEvents[0]?.title) {
          const t = todayEvents[0].title;
          setFocusTitle(t.length > 36 ? `${t.slice(0, 34)}…` : t);
          setFocusSub(todayEvents[0].meta || "Today's priority · Roles");
        } else {
          setFocusTitle(null);
          setFocusSub(null);
        }

        setUpcoming(
          todayEvents.slice(0, 4).map((ev) => {
            const time = formatTimeET(ev.start);
            const dur = durationLabel(ev.start, ev.end, ev.allDay);
            const isAlo =
              ev.domain === "ALO" || /alo/i.test(ev.title || "");
            return {
              id: ev.id,
              title: ev.title,
              meta: `${time} · ${dur}`,
              badge: isAlo ? "Prep" : "Review",
            };
          }),
        );
      } else {
        setCalKnown(false);
        setMeetingsToday(null);
        setCollisionDays(0);
        setFocusTitle(null);
        setFocusSub(null);
        setUpcoming([]);
      }
    } catch {
      setInboxCount(null);
      setCalKnown(false);
      setMeetingsToday(null);
      setCollisionDays(0);
      setFocusTitle(null);
      setFocusSub(null);
      setUpcoming([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [status, load]);

  const { lastRefreshedAt } = useLiveRefresh(load, {
    intervalMs: 4 * 60 * 1000,
  });
  const updatedLabel = formatUpdatedAt(lastRefreshedAt);

  const approvalCount = 0;
  const progressPct = useMemo(() => {
    if (!focusTitle) return 0;
    if (/alo/i.test(focusTitle)) return 60;
    return meetingsToday && meetingsToday > 0 ? 35 : 15;
  }, [focusTitle, meetingsToday]);

  return (
    <div className="px-4 pb-4 pt-2 md:px-6 md:pb-6 md:pt-4">
      <header className="mb-4 flex items-start justify-between gap-3 md:mb-5">
        <div>
          <h1 className="font-serif text-[28px] font-bold tracking-tight text-navy md:text-[34px]">
            Today
          </h1>
          {updatedLabel ? (
            <p className="mt-0.5 text-[11px] text-navy/45 md:text-[12px]">{updatedLabel}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onNavigate("inbox")}
          className="relative mt-1 grid h-10 w-10 place-items-center rounded-full text-navy md:h-11 md:w-11"
          aria-label="Notifications / inbox"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 4.2 1.5 5.5 1.5 5.5H5s1.5-1.3 1.5-5.5Z"
            />
            <path strokeLinecap="round" d="M10 18.5a2 2 0 0 0 4 0" />
          </svg>
          {inboxCount != null && inboxCount > 0 ? (
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-teal" />
          ) : null}
        </button>
      </header>

      <section
        className="mb-3 rounded-2xl border border-[rgba(27,54,68,0.08)] bg-white p-4 shadow-sm md:mb-4 md:p-5"
        aria-label="Focus"
      >
        <div className="mb-2 flex items-center gap-1.5">
          <LeafIcon />
          <span className="text-[11px] font-bold uppercase tracking-wider text-teal md:text-[12px]">
            Focus
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-teal" aria-hidden />
        </div>
        <h2 className="font-serif text-[20px] font-bold leading-snug text-navy md:text-[24px]">
          {focusTitle ?? (calKnown ? "Clear runway today" : "Sign in for live focus")}
        </h2>
        <p className="mt-1 text-[13px] text-navy/60 md:text-[15px]">
          {focusSub ??
            (calKnown
              ? "No role priority flagged · Protect 9–5"
              : "Connect Google in Settings for live calendar")}
        </p>
        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-[rgba(27,54,68,0.08)]"
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-teal transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => onNavigate("agenda")}
            className="text-[12px] font-semibold text-teal md:text-[13px]"
          >
            High priority ›
          </button>
        </div>
      </section>

      <section
        className="mb-3 grid grid-cols-3 gap-2 md:mb-4 md:gap-3"
        aria-label="Quick stats"
      >
        <button
          type="button"
          onClick={() => onNavigate("agenda")}
          className="rounded-xl border border-[rgba(27,54,68,0.08)] bg-white px-2 py-3 text-center shadow-sm md:px-3 md:py-4"
        >
          <span className="mx-auto mb-1 grid h-7 w-7 place-items-center text-teal" aria-hidden>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <rect x="3.5" y="5" width="17" height="15" rx="2" />
              <path strokeLinecap="round" d="M8 3.5v3M16 3.5v3M3.5 9.5h17" />
            </svg>
          </span>
          <div className="font-serif text-xl font-bold text-navy md:text-2xl">
            {meetingsToday != null ? meetingsToday : "—"}
          </div>
          <div className="text-[10px] font-medium text-navy/55 md:text-[11px]">Today</div>
        </button>
        <button
          type="button"
          onClick={() => onNavigate("inbox")}
          className="rounded-xl border border-[rgba(27,54,68,0.08)] bg-white px-2 py-3 text-center shadow-sm md:px-3 md:py-4"
        >
          <span className="mx-auto mb-1 grid h-7 w-7 place-items-center text-teal" aria-hidden>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6.5h16v11a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-11Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="m4 7 8 6 8-6" />
            </svg>
          </span>
          <div className="font-serif text-xl font-bold text-navy md:text-2xl">
            {inboxCount != null ? inboxCount : "—"}
          </div>
          <div className="text-[10px] font-medium text-navy/55 md:text-[11px]">Unread</div>
        </button>
        <button
          type="button"
          onClick={() => onNavigate("more", { more: "approvals" })}
          className="rounded-xl border border-[rgba(27,54,68,0.08)] bg-white px-2 py-3 text-center shadow-sm md:px-3 md:py-4"
        >
          <span className="mx-auto mb-1 grid h-7 w-7 place-items-center text-teal" aria-hidden>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <circle cx="12" cy="12" r="8.25" />
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.5 12.2 2.4 2.3 4.6-5" />
            </svg>
          </span>
          <div className="font-serif text-xl font-bold text-navy md:text-2xl">{approvalCount}</div>
          <div className="text-[10px] font-medium text-navy/55 md:text-[11px]">Pending</div>
        </button>
      </section>

      {collisionDays > 0 ? (
        <div className="mb-3">
          <div
            role="alert"
            className="flex items-center gap-2.5 rounded-xl border border-[rgba(27,54,68,0.1)] bg-white px-3.5 py-3 shadow-sm md:gap-3 md:px-4 md:py-3.5"
          >
            <span
              className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-navy text-sm font-bold text-white"
              aria-hidden
            >
              !
            </span>
            <p className="text-[13px] font-semibold text-navy md:text-[14px]">
              Collision detected
              <span className="font-normal text-navy/55">
                {" "}
                · {collisionDays} evening stack
                {collisionDays === 1 ? "" : "s"}
              </span>
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-3 -mx-4">
          <CollisionBanner />
        </div>
      )}

      <section aria-label="Upcoming and recent">
        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-navy/45 md:mb-3 md:text-[12px]">
          Upcoming &amp; Recent
        </h3>
        {upcoming.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[rgba(27,54,68,0.18)] bg-white/60 px-3 py-4 text-[13px] text-navy/55 md:px-4 md:py-5 md:text-[14px]">
            {calKnown
              ? "No role events on the calendar today."
              : "Sign in to load today's agenda."}
          </p>
        ) : (
          <ul className="space-y-2 md:space-y-2.5">
            {upcoming.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-xl border border-[rgba(27,54,68,0.08)] bg-white px-3 py-3 shadow-sm md:gap-3.5 md:px-4 md:py-3.5"
              >
                <span
                  className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-[rgba(45,106,108,0.1)] text-teal md:h-10 md:w-10"
                  aria-hidden
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <rect x="3.5" y="5" width="17" height="15" rx="2" />
                    <path strokeLinecap="round" d="M8 3.5v3M16 3.5v3M3.5 9.5h17" />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-navy md:text-[15px]">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-navy/50 md:text-[12px]">{item.meta}</p>
                </div>
                <span className="flex-shrink-0 rounded-full border border-[rgba(45,106,108,0.35)] bg-[rgba(45,106,108,0.08)] px-2.5 py-0.5 text-[11px] font-semibold text-teal md:px-3 md:text-[12px]">
                  {item.badge}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
