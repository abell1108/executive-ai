import type {
  CalendarDay,
  Domain,
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

/** Soft week label when live range unavailable. */
export const WEEK_SUB = "This week · Domains only";

export const COLLISION_MESSAGE =
  "HIGH COLLISION · Burnout risk if evening stacked — protect after-5 capacity.";

export const RULE_TAGS = [
  "Domain events only",
  "Approvals required",
  "After-5 role work",
];

/** Next 2nd Saturday ~11 AM ET (approx) — used for live ALO countdown when found. */
export function nextAloTargetIso(from = new Date()): string {
  const y = from.getFullYear();
  const m = from.getMonth();
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
 * Chrome only — no hard-coded corporate 9–5 pills; live domain events overlay separately.
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
    const isToday = isCurrentMonth && d === todayDate;
    cells.push({ day: d, isToday, pills: [], dots: [] });
  }

  let next = 1;
  while (cells.length < 42) {
    cells.push({ day: next++, outOfMonth: true, pills: [], dots: [] });
  }

  return cells;
}

/** Empty month chrome for current calendar month. */
export function buildSeptember2026(): CalendarDay[] {
  const now = new Date();
  return buildMonthGrid(now.getFullYear(), now.getMonth());
}
