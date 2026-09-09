import type { Domain } from "./types";

export type AloStandingEvent = {
  id: string;
  title: string;
  meta: string;
  domain: Domain;
  start: string;
  end: string;
  allDay: false;
  description?: string;
  standing: true;
};

/** Wall-clock America/New_York → ISO with correct offset for that date. */
function etWallToIso(ymd: string, hour: number, minute: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  for (const offsetHours of [4, 5] as const) {
    const utc = Date.UTC(y, m - 1, d, hour + offsetHours, minute, 0);
    const dt = new Date(utc);
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      })
        .formatToParts(dt)
        .filter((p) => p.type !== "literal")
        .map((p) => [p.type, p.value]),
    ) as Record<string, string>;
    if (
      Number(parts.year) === y &&
      Number(parts.month) === m &&
      Number(parts.day) === d &&
      Number(parts.hour) === hour &&
      Number(parts.minute) === minute
    ) {
      const hh = String(hour).padStart(2, "0");
      const mm = String(minute).padStart(2, "0");
      const oh = String(offsetHours).padStart(2, "0");
      return `${ymd}T${hh}:${mm}:00-${oh}:00`;
    }
  }
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return `${ymd}T${hh}:${mm}:00-04:00`;
}

function formatMeta(startIso: string, endIso: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
  };
  const s = new Date(startIso).toLocaleTimeString("en-US", opts);
  const e = new Date(endIso).toLocaleTimeString("en-US", opts);
  return `${s}–${e} ET`;
}

type StandingSpec = {
  date: string;
  kind: "meeting" | "prep";
};

/** Standing ALO Chapter ops schedule (America/New_York). Real ops dates — not demo seed. */
const STANDING: StandingSpec[] = [
  // Meetings 11:00–12:30 ET
  { date: "2026-09-12", kind: "meeting" },
  { date: "2026-10-10", kind: "meeting" },
  { date: "2026-11-14", kind: "meeting" },
  { date: "2026-12-12", kind: "meeting" },
  { date: "2027-01-09", kind: "meeting" },
  { date: "2027-02-13", kind: "meeting" },
  { date: "2027-03-13", kind: "meeting" },
  // Prep 17:30–18:15 ET
  { date: "2026-09-09", kind: "prep" },
  { date: "2026-09-29", kind: "prep" },
  { date: "2026-11-03", kind: "prep" },
  { date: "2026-12-01", kind: "prep" },
  { date: "2026-12-29", kind: "prep" },
  { date: "2027-02-02", kind: "prep" },
  { date: "2027-03-02", kind: "prep" },
];

function buildEvent(spec: StandingSpec): AloStandingEvent {
  const isMeeting = spec.kind === "meeting";
  const title = isMeeting ? "ALO Chapter Meeting" : "ALO Chapter prep";
  const startH = isMeeting ? 11 : 17;
  const startM = isMeeting ? 0 : 30;
  const endH = isMeeting ? 12 : 18;
  const endM = isMeeting ? 30 : 15;
  const start = etWallToIso(spec.date, startH, startM);
  const end = etWallToIso(spec.date, endH, endM);
  const idPrefix = isMeeting ? "alo-meeting" : "alo-prep";
  return {
    id: `${idPrefix}-${spec.date}`,
    title,
    meta: formatMeta(start, end),
    domain: "ALO",
    start,
    end,
    allDay: false,
    description: isMeeting
      ? "Standing ALO Chapter Meeting (2nd Saturday)."
      : "Standing ALO Chapter prep block.",
    standing: true,
  };
}

const ALL_STANDING: AloStandingEvent[] = STANDING.map(buildEvent).sort(
  (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
);

/** All standing ALO events overlapping [timeMin, timeMax). */
export function listAloEventsInRange(
  timeMin: string,
  timeMax: string,
): AloStandingEvent[] {
  const min = new Date(timeMin).getTime();
  const max = new Date(timeMax).getTime();
  if (Number.isNaN(min) || Number.isNaN(max)) return [];
  return ALL_STANDING.filter((ev) => {
    const s = new Date(ev.start).getTime();
    const e = new Date(ev.end).getTime();
    return s < max && e > min;
  });
}

export function allStandingAloEvents(): AloStandingEvent[] {
  return ALL_STANDING.slice();
}
