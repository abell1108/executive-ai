import type {
  AgendaDay,
  ApprovalItem,
  CalendarDay,
  Domain,
  InboxItem,
  PillKind,
} from "./types";

export const DOMAINS: Domain[] = [
  "All",
  "TPFI",
  "DeeperRSC",
  "Myers",
  "ALO",
  "KB",
  "SRF",
];

/** Soft demo week label — UI prefers live week range when signed in. */
export const WEEK_SUB = "This week · Mon–Fri 9–5 protected";

export const COLLISION_MESSAGE =
  "HIGH COLLISION · Burnout risk if evening stacked — protect after-5 capacity.";

export const AGENDA_DAYS: AgendaDay[] = [
  {
    label: "Today",
    dateKey: "seed-today",
    isToday: true,
    events: [
      {
        title: "Protected focus block",
        meta: "9–5 · Rules · role work only after 5",
        domain: "Myers",
      },
      {
        title: "Global Africa Summit (demo)",
        meta: "All day · Charlotte · TPFI",
        domain: "TPFI",
      },
    ],
  },
  {
    label: "Thu",
    dateKey: "seed-thu",
    events: [
      {
        title: "TPFI Thursday icebreaker",
        meta: "TBD · Leadership touchpoint",
        domain: "TPFI",
      },
    ],
  },
  {
    label: "Sat · 2nd Saturday",
    dateKey: "seed-alo",
    countdown: true,
    events: [
      {
        title: "ALO Chapter",
        meta: "11:00 AM–12:30 PM ET · virtual",
        domain: "ALO",
        highlight: "alo",
      },
    ],
  },
];

export const RULE_TAGS = [
  "Mon–Fri 9–5 protected",
  "After-5 role work",
  "Approvals required",
];

export const INBOX_ITEMS: InboxItem[] = [
  {
    domain: "TPFI",
    title: "Summit logistics thread",
    meta: "Inbox · today",
  },
  {
    domain: "TPFI",
    title: "TPFI icebreaker RSVPs",
    meta: "Inbox · Thu prep",
  },
  {
    domain: "ALO",
    title: "ALO Chapter prep packet",
    meta: "Inbox · before Sat",
  },
];

export const APPROVALS: ApprovalItem[] = [
  {
    id: "rev-ej",
    title: "Rev EJ invite",
    meta: "Outbound · awaiting Alisa",
    domain: "TPFI",
  },
  {
    id: "trinity",
    title: "Trinity podcast tips",
    meta: "Outbound · awaiting Alisa",
    domain: "DeeperRSC",
  },
  {
    id: "bwss",
    title: "BWSS 2027 email",
    meta: "Outbound · awaiting Alisa",
    domain: "SRF",
  },
];

/** Demo ALO target — next 2nd Saturday ~11 AM ET (approx). */
export function nextAloTargetIso(from = new Date()): string {
  const y = from.getFullYear();
  const m = from.getMonth();
  // 2nd Saturday of current month, or next month if past
  const first = new Date(y, m, 1);
  const firstSatOffset = (6 - first.getDay() + 7) % 7;
  const secondSat = 1 + firstSatOffset + 7;
  let target = new Date(y, m, secondSat, 11, 0, 0);
  if (target.getTime() < from.getTime()) {
    const nm = m + 1;
    const firstN = new Date(y, nm, 1);
    const off = (6 - firstN.getDay() + 7) % 7;
    const d = 1 + off + 7;
    target = new Date(y, nm, d, 11, 0, 0);
  }
  return target.toISOString();
}

/** @deprecated Prefer nextAloTargetIso() — kept for seed countdown fallback. */
export const ALO_TARGET_ISO = nextAloTargetIso();

export function domainToPillKind(domain: Domain | string): PillKind {
  switch (domain) {
    case "ALO":
      return "alo";
    case "SRF":
      return "rest";
    case "TPFI":
    case "DeeperRSC":
    case "Myers":
    case "KB":
      return "tpfi";
    default:
      return "tpfi";
  }
}

/**
 * Build a month grid (Sun-start, 6 weeks) for any year/month.
 * Weekdays get a short 9–5 corp pill; no tall bars.
 */
export function buildMonthGrid(year: number, monthIndex: number): CalendarDay[] {
  const cells: CalendarDay[] = [];
  const first = new Date(year, monthIndex, 1);
  const startDow = first.getDay(); // 0=Sun
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const prevMonthDays = new Date(year, monthIndex, 0).getDate();

  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() === monthIndex;
  const todayDate = today.getDate();

  for (let i = 0; i < startDow; i++) {
    cells.push({
      day: prevMonthDays - startDow + 1 + i,
      outOfMonth: true,
      pills: [],
      dots: [],
    });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, monthIndex, d).getDay();
    const isWeekday = dow >= 1 && dow <= 5;
    const isToday = isCurrentMonth && d === todayDate;
    if (isWeekday) {
      cells.push({
        day: d,
        isToday,
        pills: [{ label: "9–5", kind: "corp" }],
        dots: ["corp"],
      });
    } else {
      cells.push({ day: d, isToday, pills: [], dots: [] });
    }
  }

  let next = 1;
  while (cells.length < 42) {
    cells.push({ day: next++, outOfMonth: true, pills: [], dots: [] });
  }

  return cells;
}

/** Legacy seed month — soft demo overlay for current calendar month. */
export function buildSeptember2026(): CalendarDay[] {
  const now = new Date();
  return buildMonthGrid(now.getFullYear(), now.getMonth());
}
