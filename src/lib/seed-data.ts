import type {
  AgendaDay,
  ApprovalItem,
  CalendarDay,
  Domain,
  InboxItem,
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

export const WEEK_SUB = "Sep 8–14 · Mon–Fri 9–5 protected";

export const COLLISION_MESSAGE =
  "HIGH COLLISION · Burnout risk if evening stacked — protect after-5 capacity.";

export const AGENDA_DAYS: AgendaDay[] = [
  {
    label: "Tue Sep 8",
    dateKey: "2026-09-08",
    isToday: true,
    events: [
      {
        title: "Protected focus block",
        meta: "9–5 · Rules · role work only after 5",
        domain: "Myers",
      },
      {
        title: "Global Africa Summit",
        meta: "All day · Sep 8–10 · Charlotte · TPFI",
        domain: "TPFI",
      },
    ],
  },
  {
    label: "Thu Sep 10",
    dateKey: "2026-09-10",
    events: [
      {
        title: "TPFI Thursday icebreaker",
        meta: "TBD · Leadership touchpoint",
        domain: "TPFI",
      },
    ],
  },
  {
    label: "Sat Sep 12",
    dateKey: "2026-09-12",
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

/** September 2026 month grid — Sun start; short pills + dots only (no tall bars) */
export function buildSeptember2026(): CalendarDay[] {
  const cells: CalendarDay[] = [];
  // Aug 30, 31 (out)
  cells.push({ day: 30, outOfMonth: true, pills: [], dots: [] });
  cells.push({ day: 31, outOfMonth: true, pills: [], dots: [] });

  const corp = (
    d: number,
    extra: CalendarDay["pills"] = [],
    extraDots: CalendarDay["dots"] = [],
  ): CalendarDay => ({
    day: d,
    isToday: d === 8,
    pills: [{ label: "9–5", kind: "corp" }, ...extra],
    dots: ["corp", ...extraDots],
  });

  const weekend = (
    d: number,
    pills: CalendarDay["pills"] = [],
    dots: CalendarDay["dots"] = [],
  ): CalendarDay => ({
    day: d,
    pills,
    dots,
  });

  // Sep 1–5
  for (let d = 1; d <= 5; d++) {
    if (d <= 4) cells.push(corp(d));
    else cells.push(weekend(5));
  }
  // 6–7
  cells.push(weekend(6));
  cells.push(corp(7));
  // 8–12 week of focus
  cells.push(corp(8, [{ label: "Summit", kind: "tpfi" }], ["tpfi"]));
  cells.push(
    corp(
      9,
      [
        { label: "Summit", kind: "tpfi" },
        { label: "Lighter", kind: "rest" },
      ],
      ["tpfi", "rest"],
    ),
  );
  cells.push(
    corp(
      10,
      [
        { label: "Summit", kind: "tpfi" },
        { label: "Icebreaker", kind: "tpfi" },
      ],
      ["tpfi", "tpfi"],
    ),
  );
  cells.push(corp(11));
  cells.push(
    weekend(
      12,
      [
        { label: "Breakfast", kind: "alo" },
        { label: "Chapter", kind: "alo" },
      ],
      ["alo", "alo"],
    ),
  );
  // 13–30
  cells.push(weekend(13));
  for (let d = 14; d <= 30; d++) {
    const dow = new Date(Date.UTC(2026, 8, d)).getUTCDay(); // 0=Sun
    if (dow === 0 || dow === 6) cells.push(weekend(d));
    else cells.push(corp(d));
  }
  // Oct 1–3 out
  cells.push({ day: 1, outOfMonth: true, pills: [], dots: [] });
  cells.push({ day: 2, outOfMonth: true, pills: [], dots: [] });
  cells.push({ day: 3, outOfMonth: true, pills: [], dots: [] });

  return cells;
}

export const ALO_TARGET_ISO = "2026-09-12T15:00:00.000Z"; // 11:00 AM ET
