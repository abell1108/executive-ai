import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { listAloEventsInRange, type AloStandingEvent } from "@/lib/alo-schedule";
import { authOptions, isGoogleConfigured } from "@/lib/auth";
import { inferDomain } from "@/lib/domain-label";

type CalEvent = {
  id: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  location?: string;
  htmlLink?: string;
};

type ApiCalEvent = {
  id: string;
  title: string;
  meta: string;
  domain: NonNullable<ReturnType<typeof inferDomain>>;
  start: string;
  end: string;
  allDay: boolean;
  description?: string;
  location?: string;
  htmlLink?: string;
  standing?: boolean;
};

/** Start of current calendar month in America/New_York → +8 months. */
function defaultWindowET(now = new Date()): { timeMin: string; timeMax: string } {
  const ny = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now); // YYYY-MM-DD
  const [y, m] = ny.split("-").map(Number);
  // ~midnight ET on the 1st (UTC+4 approx covers EDT/EST boundary)
  const timeMin = new Date(Date.UTC(y, m - 1, 1, 4, 0, 0));
  const timeMax = new Date(Date.UTC(y, m - 1 + 8, 1, 4, 0, 0));
  return { timeMin: timeMin.toISOString(), timeMax: timeMax.toISOString() };
}

function formatEventMeta(ev: CalEvent, allDay: boolean): string {
  const start = ev.start?.dateTime || ev.start?.date || "";
  const end = ev.end?.dateTime || ev.end?.date || "";
  if (allDay) {
    return `All day${ev.location ? ` · ${ev.location}` : ""}`;
  }
  try {
    const opts: Intl.DateTimeFormatOptions = {
      timeZone: "America/New_York",
      hour: "numeric",
      minute: "2-digit",
    };
    const s = start ? new Date(start).toLocaleTimeString("en-US", opts) : "";
    const e = end ? new Date(end).toLocaleTimeString("en-US", opts) : "";
    const range = s && e ? `${s}–${e} ET` : s || "Timed";
    return `${range}${ev.location ? ` · ${ev.location}` : ""}`;
  } catch {
    return ev.location || "Event";
  }
}

function nyDateKeyFromIso(iso: string, allDay?: boolean): string {
  if (allDay && /^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function titlesMatchAlo(a: string, b: string): boolean {
  const norm = (t: string) => t.toLowerCase().replace(/\s+/g, " ").trim();
  return norm(a) === norm(b);
}

/** Dedupe standing ALO vs Google when same day + same title. */
function mergeStanding(
  googleEvents: ApiCalEvent[],
  standing: AloStandingEvent[],
): ApiCalEvent[] {
  const merged: ApiCalEvent[] = [...googleEvents];
  for (const alo of standing) {
    const already = googleEvents.some(
      (g) =>
        nyDateKeyFromIso(g.start, g.allDay) === nyDateKeyFromIso(alo.start) &&
        titlesMatchAlo(g.title, alo.title),
    );
    if (already) continue;
    merged.push({
      id: alo.id,
      title: alo.title,
      meta: alo.meta,
      domain: "ALO",
      start: alo.start,
      end: alo.end,
      allDay: false,
      description: alo.description,
      standing: true,
    });
  }
  merged.sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  );
  return merged;
}

function parseWindow(req: NextRequest): { timeMin: string; timeMax: string } {
  const sp = req.nextUrl.searchParams;
  const qMin = sp.get("timeMin");
  const qMax = sp.get("timeMax");
  const defaults = defaultWindowET();
  const timeMin = qMin && !Number.isNaN(Date.parse(qMin)) ? qMin : defaults.timeMin;
  const timeMax = qMax && !Number.isNaN(Date.parse(qMax)) ? qMax : defaults.timeMax;
  return { timeMin, timeMax };
}

function standingOnlyResponse(
  timeMin: string,
  timeMax: string,
  extras: {
    configured: boolean;
    authenticated: boolean;
    message?: string;
  },
) {
  const standing = listAloEventsInRange(timeMin, timeMax);
  const events = mergeStanding([], standing);
  return NextResponse.json({
    configured: extras.configured,
    authenticated: extras.authenticated,
    source: "standing" as const,
    overlay: "standing-alo" as const,
    message: extras.message,
    timeMin,
    timeMax,
    events,
  });
}

export async function GET(req: NextRequest) {
  const { timeMin, timeMax } = parseWindow(req);

  try {
    if (!isGoogleConfigured()) {
      return standingOnlyResponse(timeMin, timeMax, {
        configured: false,
        authenticated: false,
        message: "Connect Google to sync Calendar. Standing ALO schedule included.",
      });
    }

    const session = await getServerSession(authOptions);
    const accessToken = (session as { accessToken?: string } | null)?.accessToken;

    if (!session || !accessToken) {
      return standingOnlyResponse(timeMin, timeMax, {
        configured: true,
        authenticated: false,
        message: "Sign in required. Standing ALO schedule included.",
      });
    }

    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250",
    });

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      },
    );

    if (res.status === 401 || res.status === 403) {
      return standingOnlyResponse(timeMin, timeMax, {
        configured: true,
        authenticated: false,
        message:
          "Calendar token expired or insufficient scope — re-sign in. Standing ALO schedule included.",
      });
    }

    if (!res.ok) {
      const standing = listAloEventsInRange(timeMin, timeMax);
      const events = mergeStanding([], standing);
      return NextResponse.json({
        configured: true,
        authenticated: true,
        source: "live" as const,
        overlay: "standing-alo" as const,
        message: `Calendar list failed (${res.status}). Standing ALO schedule included.`,
        timeMin,
        timeMax,
        events,
      });
    }

    const data = (await res.json()) as { items?: CalEvent[] };
    const googleEvents: ApiCalEvent[] = [];
    for (const ev of data.items ?? []) {
      const title = ev.summary || "(no title)";
      const allDay = Boolean(ev.start?.date && !ev.start?.dateTime);
      const start = ev.start?.dateTime || ev.start?.date || "";
      const end = ev.end?.dateTime || ev.end?.date || "";
      const domain = inferDomain(`${title} ${ev.description ?? ""}`);
      if (!domain) continue;
      googleEvents.push({
        id: ev.id,
        title,
        meta: formatEventMeta(ev, allDay),
        domain,
        start,
        end,
        allDay,
        description: ev.description || undefined,
        location: ev.location || undefined,
        htmlLink: ev.htmlLink || undefined,
      });
    }

    const standing = listAloEventsInRange(timeMin, timeMax);
    const events = mergeStanding(googleEvents, standing);

    return NextResponse.json({
      configured: true,
      authenticated: true,
      source: "live" as const,
      overlay: "standing-alo" as const,
      timeMin,
      timeMax,
      events,
    });
  } catch {
    return standingOnlyResponse(timeMin, timeMax, {
      configured: isGoogleConfigured(),
      authenticated: false,
      message: "Calendar request failed. Standing ALO schedule included.",
    });
  }
}
