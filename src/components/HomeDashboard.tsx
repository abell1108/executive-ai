"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import type { Domain } from "@/lib/types";
import { CollisionBanner } from "./CollisionBanner";

const SNAP_DOMAINS: Exclude<Domain, "All">[] = [
  "TPFI",
  "DeeperRSC",
  "Myers",
  "ALO",
  "KB",
  "SRF",
];

type GmailApiResponse = {
  source?: "live" | "none";
  items?: { domain?: string; title?: string }[];
};

type CalendarApiResponse = {
  source?: "live" | "standing" | "none";
  events?: {
    id: string;
    title: string;
    start: string;
    end: string;
    allDay?: boolean;
    domain?: string;
  }[];
};

function etGreeting(now = new Date()): "morning" | "afternoon" | "evening" {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      hour12: false,
    }).format(now),
  );
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

function etDateLabel(now = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(now);
}

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

function countEveningStacks(
  events: NonNullable<CalendarApiResponse["events"]>,
): number {
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

function HexLogo({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
    >
      <path
        d="M16 2.5 28 9.5v13L16 29.5 4 22.5v-13L16 2.5Z"
        fill="#1B3644"
      />
      <path
        d="M16 8.5 22.5 12v8L16 23.5 9.5 20v-8L16 8.5Z"
        fill="#2D6A6C"
      />
    </svg>
  );
}

export function HomeDashboard() {
  const { status } = useSession();
  const greeting = etGreeting();
  const dateLabel = etDateLabel();

  const [inboxCount, setInboxCount] = useState<number | null>(null);
  const [collisionDays, setCollisionDays] = useState(0);
  const [todayFocus, setTodayFocus] = useState<string | null>(null);
  const [aloSoon, setAloSoon] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [gmailRes, calRes] = await Promise.all([
          fetch("/api/gmail", { cache: "no-store" }),
          fetch("/api/calendar", { cache: "no-store" }),
        ]);
        const gmail = (await gmailRes.json()) as GmailApiResponse;
        const cal = (await calRes.json()) as CalendarApiResponse;
        if (cancelled) return;

        if (gmail.source === "live" && Array.isArray(gmail.items)) {
          setInboxCount(gmail.items.length);
        } else {
          setInboxCount(null);
        }

        const events = Array.isArray(cal.events) ? cal.events : [];
        if (cal.source === "live" || cal.source === "standing") {
          setCollisionDays(countEveningStacks(events));
          const today = todayKeyET();
          const todayEvents = events.filter(
            (e) => e.start && etDateKey(e.start) === today,
          );
          const aloToday = todayEvents.find((e) =>
            /alo/i.test(e.title || "") || e.domain === "ALO",
          );
          if (aloToday) {
            setTodayFocus("ALO prep");
          } else if (todayEvents[0]?.title) {
            const t = todayEvents[0].title;
            setTodayFocus(t.length > 28 ? `${t.slice(0, 26)}…` : t);
          } else {
            setTodayFocus(null);
          }
          const hasAlo = events.some(
            (e) => e.domain === "ALO" || /alo/i.test(e.title || ""),
          );
          setAloSoon(hasAlo);
        } else {
          setCollisionDays(0);
          setTodayFocus(null);
          setAloSoon(false);
        }
      } catch {
        if (!cancelled) {
          setInboxCount(null);
          setCollisionDays(0);
          setTodayFocus(null);
          setAloSoon(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [status]);

  // Approvals stay empty until real outbound drafts exist (no seed fallbacks).
  const [approvalCount] = useState(0);

  const summary = useMemo(() => {
    const parts: { text: string; highlight?: boolean }[] = [];
    if (todayFocus) {
      parts.push({ text: todayFocus, highlight: true });
    } else if (aloSoon) {
      parts.push({ text: "ALO ahead", highlight: true });
    } else {
      parts.push({ text: "Domains quiet" });
    }
    if (inboxCount != null) {
      parts.push({ text: `${inboxCount} inbox` });
    } else {
      parts.push({ text: "inbox —" });
    }
    const approvalLabel =
      approvalCount === 1 ? "1 approval" : `${approvalCount} approvals`;
    parts.push({
      text: approvalLabel,
      highlight: approvalCount > 0,
    });
    parts.push({ text: "rest OK" });
    return parts;
  }, [todayFocus, aloSoon, inboxCount, approvalCount]);

  const agendaSub = aloSoon ? "Wed prep + Sat ALO" : "This week · Domains";
  const inboxSub =
    inboxCount != null ? `${inboxCount} domain` : "Sign in for live";
  const approvalSub =
    approvalCount > 0
      ? `${approvalCount} draft waiting your OK`
      : "No drafts waiting";

  return (
    <div className="flex min-h-screen flex-col bg-cream text-navy">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(27,54,68,0.12)] px-3 py-3 sm:px-6 sm:py-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2.5 no-underline"
            aria-label="Alisa EA Command Center home"
          >
            <HexLogo />
            <div className="min-w-0">
              <h1 className="font-serif text-[17px] font-bold tracking-tight text-navy sm:text-[20px]">
                Alisa EA Command Center
              </h1>
            </div>
          </Link>
          <span
            className="hidden h-6 w-px bg-[rgba(27,54,68,0.18)] sm:block"
            aria-hidden
          />
          <p className="hidden text-xs text-navy/55 sm:block">
            Operated by Roxy
          </p>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <Link
            href="/settings"
            className="rounded-full border border-[rgba(27,54,68,0.12)] bg-white px-3 py-1.5 text-[11px] font-semibold text-navy shadow-sm hover:border-teal hover:text-teal sm:text-[12px]"
          >
            Settings
          </Link>
          <div className="flex items-center gap-2 text-xs text-navy/70">
            <span aria-hidden>📅</span>
            <span className="font-medium">{dateLabel}</span>
          </div>
          <span
            className="hidden h-6 w-px bg-[rgba(27,54,68,0.18)] sm:block"
            aria-hidden
          />
          <div
            className="grid h-8 w-8 place-items-center rounded-full bg-navy text-[11px] font-bold text-white"
            aria-label="Alisa Bellamy"
            title="AB"
          >
            AB
          </div>
        </div>
      </header>

      <p className="px-3 pt-2 text-[10px] text-navy/45 sm:hidden">
        Operated by Roxy
      </p>

      {collisionDays > 0 ? (
        <div className="px-3 pt-3 sm:px-6 sm:pt-4">
          <div
            role="alert"
            className="flex items-center gap-2.5 rounded-[10px] border border-[rgba(180,83,9,0.35)] bg-alert-bg px-3 py-2.5 text-alert-text sm:px-4"
          >
            <span className="text-lg" aria-hidden>
              ⚠
            </span>
            <p className="text-[12px] font-bold sm:text-[13px]">
              {collisionDays} schedule collision
              {collisionDays === 1 ? "" : "s"} · Protect corporate 9–5
            </p>
          </div>
        </div>
      ) : (
        <CollisionBanner />
      )}

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-3 py-4 sm:gap-5 sm:px-6 sm:py-6">
        <section
          className="rounded-2xl border-2 border-teal/35 bg-white px-4 py-4 shadow-sm sm:px-5 sm:py-5"
          aria-label="Daily greeting"
        >
          <div className="flex items-start gap-3 sm:gap-4">
            <div
              className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full bg-teal text-white sm:h-12 sm:w-12"
              aria-hidden
            >
              <span className="text-xl">{greeting === "evening" ? "☾" : "☀"}</span>
            </div>
            <div className="min-w-0">
              <h2 className="font-serif text-[22px] font-bold tracking-tight text-navy sm:text-[26px]">
                Good {greeting}, Alisa
              </h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-navy/70 sm:text-sm">
                Today:{" "}
                {summary.map((part, i) => (
                  <span key={`${part.text}-${i}`}>
                    {i > 0 ? " · " : null}
                    <span
                      className={
                        part.highlight
                          ? "font-semibold text-teal"
                          : "font-medium text-navy/80"
                      }
                    >
                      {part.text}
                    </span>
                  </span>
                ))}
              </p>
            </div>
          </div>
        </section>

        <section
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3"
          aria-label="Snap cards"
        >
          <SnapCard
            href="/desk?panel=agenda"
            title="Agenda"
            sub={agendaSub}
            icon="🗓"
            badges={["1", "2"]}
          />
          <SnapCard
            href="/desk?panel=inbox"
            title="Inbox"
            sub={inboxSub}
            icon="✉"
            badges={["2", "3"]}
          />
          <SnapCard
            href="/desk?panel=approvals"
            title="Approval Queue"
            sub={
              approvalCount > 0 ? (
                <>
                  <span className="font-bold text-teal">{approvalCount}</span>{" "}
                  draft waiting your OK
                </>
              ) : (
                approvalSub
              )
            }
            icon="☑"
            badges={["3", "1"]}
            emphasize
            titleCaps
          />
          <SnapCard
            href="/desk?panel=calendar"
            title="Calendar"
            sub="Sep view"
            icon="📅"
            badges={["4"]}
          />
          <Link
            href="/desk?panel=rest"
            className="group flex min-h-[140px] flex-col rounded-2xl border-2 border-teal/40 bg-[rgba(45,106,108,0.08)] p-4 no-underline shadow-sm transition hover:border-teal hover:shadow-md sm:min-h-[150px]"
          >
            <div className="mb-2 flex items-center gap-2.5">
              <span
                className="grid h-9 w-9 place-items-center rounded-full bg-teal text-white"
                aria-hidden
              >
                ❀
              </span>
              <h3 className="font-serif text-[16px] font-bold text-teal sm:text-[17px]">
                Rest &amp; burnout guards
              </h3>
            </div>
            <p className="flex-1 text-[12px] leading-snug text-navy/65 sm:text-[13px]">
              Buffers OK · lighter evening reserved · wind-down protected
            </p>
            <span className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-teal px-3 py-1 text-[11px] font-bold text-white">
              ✓ Guarded
            </span>
          </Link>
          <div className="relative flex min-h-[140px] flex-col rounded-2xl border border-[rgba(27,54,68,0.12)] bg-white p-4 shadow-sm sm:min-h-[150px]">
            <span className="absolute left-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-teal text-[10px] font-bold text-white">
              6
            </span>
            <div className="mb-2 flex items-center gap-2 pl-6">
              <span className="text-lg" aria-hidden>
                ▤
              </span>
              <h3 className="font-serif text-[16px] font-bold text-navy sm:text-[17px]">
                Domains
              </h3>
            </div>
            <div className="mt-auto flex flex-wrap gap-1.5">
              {SNAP_DOMAINS.map((d) => (
                <Link
                  key={d}
                  href={`/desk?domain=${encodeURIComponent(d)}`}
                  className={
                    d === "ALO"
                      ? "rounded-full bg-teal px-2.5 py-1 text-[11px] font-semibold text-white no-underline hover:bg-[#25585a]"
                      : "rounded-full border border-[rgba(27,54,68,0.14)] bg-cream px-2.5 py-1 text-[11px] font-semibold text-navy no-underline hover:border-teal hover:text-teal"
                  }
                >
                  {d}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <footer className="mt-auto rounded-xl border border-navy/20 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span
                className="grid h-8 w-8 place-items-center rounded-lg bg-teal/15 text-teal"
                aria-hidden
              >
                ☑
              </span>
              <p className="text-[13px] font-semibold text-navy sm:text-sm">
                Sunday Weekly Recap · ready Sunday 6pm
              </p>
            </div>
            <span className="text-lg text-navy/50" aria-hidden>
              ☾
            </span>
          </div>
        </footer>
      </main>
    </div>
  );
}

function SnapCard({
  href,
  title,
  sub,
  icon,
  badges,
  emphasize,
  titleCaps,
}: {
  href: string;
  title: string;
  sub: ReactNode;
  icon: string;
  badges?: string[];
  emphasize?: boolean;
  titleCaps?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        emphasize
          ? "group relative flex min-h-[140px] flex-col rounded-2xl border-2 border-teal bg-white p-4 no-underline shadow-sm transition hover:shadow-md sm:min-h-[150px]"
          : "group relative flex min-h-[140px] flex-col rounded-2xl border border-[rgba(27,54,68,0.12)] bg-white p-4 no-underline shadow-sm transition hover:border-teal/50 hover:shadow-md sm:min-h-[150px]"
      }
    >
      {badges?.map((b, i) => (
        <span
          key={`${b}-${i}`}
          className={
            i === 0
              ? "absolute left-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-teal text-[10px] font-bold text-white"
              : "absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-teal text-[10px] font-bold text-white"
          }
        >
          {b}
        </span>
      ))}
      <div className="mb-2 flex items-center gap-2.5 pt-4">
        <span className="text-xl" aria-hidden>
          {icon}
        </span>
        <h3
          className={
            titleCaps
              ? "font-serif text-[15px] font-bold uppercase tracking-wide text-navy sm:text-[16px]"
              : "font-serif text-[16px] font-bold text-navy sm:text-[17px]"
          }
        >
          {title}
        </h3>
      </div>
      <p className="mt-auto text-[12px] leading-snug text-navy/60 sm:text-[13px]">
        {sub}
      </p>
    </Link>
  );
}
