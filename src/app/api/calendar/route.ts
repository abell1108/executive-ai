import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isGoogleConfigured } from "@/lib/auth";
import { inferDomain } from "@/lib/domain-label";

type CalEvent = {
  id: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  location?: string;
};

function monthBoundsUTC(now = new Date()): { timeMin: string; timeMax: string } {
  // Use America/New_York calendar month for the query window
  const ny = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now); // YYYY-MM-DD
  const [y, m] = ny.split("-").map(Number);
  const timeMin = new Date(Date.UTC(y, m - 1, 1, 4, 0, 0)); // ~midnight ET
  const timeMax = new Date(Date.UTC(y, m, 1, 4, 0, 0));
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

export async function GET() {
  try {
    if (!isGoogleConfigured()) {
      return NextResponse.json({
        configured: false,
        authenticated: false,
        source: "seed" as const,
        message: "Connect Google to sync Calendar.",
        events: [],
      });
    }

    const session = await getServerSession(authOptions);
    const accessToken = (session as { accessToken?: string } | null)?.accessToken;

    if (!session || !accessToken) {
      return NextResponse.json({
        configured: true,
        authenticated: false,
        source: "seed" as const,
        message: "Sign in required.",
        events: [],
      });
    }

    const { timeMin, timeMax } = monthBoundsUTC();
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "50",
    });

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      },
    );

    if (res.status === 401 || res.status === 403) {
      return NextResponse.json({
        configured: true,
        authenticated: false,
        source: "seed" as const,
        message: "Calendar token expired or insufficient scope — re-sign in.",
        events: [],
      });
    }

    if (!res.ok) {
      return NextResponse.json({
        configured: true,
        authenticated: true,
        source: "seed" as const,
        message: `Calendar list failed (${res.status}).`,
        events: [],
      });
    }

    const data = (await res.json()) as { items?: CalEvent[] };
    const events = (data.items ?? []).map((ev) => {
      const title = ev.summary || "(no title)";
      const allDay = Boolean(ev.start?.date && !ev.start?.dateTime);
      const start = ev.start?.dateTime || ev.start?.date || "";
      const end = ev.end?.dateTime || ev.end?.date || "";
      const domain = inferDomain(`${title} ${ev.description ?? ""}`);
      return {
        id: ev.id,
        title,
        meta: formatEventMeta(ev, allDay),
        domain,
        start,
        end,
        allDay,
      };
    });

    return NextResponse.json({
      configured: true,
      authenticated: true,
      source: "live" as const,
      events,
    });
  } catch {
    return NextResponse.json({
      configured: isGoogleConfigured(),
      authenticated: false,
      source: "seed" as const,
      message: "Calendar request failed.",
      events: [],
    });
  }
}
