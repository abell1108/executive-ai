import type { Domain } from "@/lib/types";

export const REVIEW_NOTIFICATIONS_STORAGE_KEY = "ea-review-notifications-v1";
export const REVIEW_NOTIFICATIONS_CHANGE_EVENT = "ea-review-notifications-change";

export type ReviewItemStatus = "needs_review" | "done" | "dismissed";

export type ReviewRole = Exclude<Domain, "All">;

export type ReviewNotification = {
  id: string;
  title: string;
  role: ReviewRole;
  sourceTitle: string;
  sourceUrl: string;
  status: ReviewItemStatus;
  seededAt: string;
  /** Optional longer body shown under the title (e.g. meeting notes briefing). */
  summary?: string;
};

/** Stable empty snapshot for useSyncExternalStore. */
export const EMPTY_REVIEW_NOTIFICATIONS: ReviewNotification[] = Object.freeze(
  [],
) as unknown as ReviewNotification[];

const SEED_SOURCE_TITLE =
  "Action Items 9.3.26 TPFI Leadership Meeting.pdf";
const SEED_SOURCE_URL =
  "https://drive.google.com/file/d/1MFLr_R3wOFjqrHm545NjTrEOD55UxO_1/view";
const SEED_AT = "2026-09-09";

/** Known Sep 9 TPFI Drive action items for Alisa (one-time seed when store empty). */
export const SEED_REVIEW_NOTIFICATIONS: ReviewNotification[] = [
  {
    id: "tpfi-2026-09-03-minister-proby-demo",
    title: "Follow up with Minister Proby for KCIO demo/training video",
    role: "TPFI",
    sourceTitle: SEED_SOURCE_TITLE,
    sourceUrl: SEED_SOURCE_URL,
    status: "needs_review",
    seededAt: SEED_AT,
  },
  {
    id: "tpfi-2026-09-03-proby-taz-contacts",
    title:
      "Share Minister Proby & Reverend Taz contacts with KCIO facilitators",
    role: "TPFI",
    sourceTitle: SEED_SOURCE_TITLE,
    sourceUrl: SEED_SOURCE_URL,
    status: "needs_review",
    seededAt: SEED_AT,
  },
  {
    id: "tpfi-2026-09-03-melia-robin-transition",
    title:
      "Connect with Melia James & Robin on member engagement committee leadership transition",
    role: "TPFI",
    sourceTitle: SEED_SOURCE_TITLE,
    sourceUrl: SEED_SOURCE_URL,
    status: "needs_review",
    seededAt: SEED_AT,
  },
  {
    id: "tpfi-2026-09-03-sep24-retreat-prep",
    title: "Use Sep 24 leadership meeting as prep for October strategy retreat",
    role: "TPFI",
    sourceTitle: SEED_SOURCE_TITLE,
    sourceUrl: SEED_SOURCE_URL,
    status: "needs_review",
    seededAt: SEED_AT,
  },
];

/**
 * Notifications merged into an already-seeded store when their id is missing.
 * Does not resurrect items the user already dismissed or marked done (those
 * remain in storage under the same id with a non-needs_review status).
 */
export const MERGED_REVIEW_NOTIFICATIONS: ReviewNotification[] = [
  {
    id: "drsc-8-10-meeting-notes",
    title: "DRSC 8.10 meeting notes",
    role: "DeeperRSC",
    sourceTitle: "DRSC 8.10 meeting notes",
    sourceUrl:
      "https://docs.google.com/document/d/1-SAah328fUxU9ssubl2KP6YKWKugV7gHqrP6O172U4A/edit",
    status: "needs_review",
    seededAt: "2026-09-10",
    summary:
      "Doc asks you to see action items and add follow-ups to Command Center. Your items: (1) Review Aug 10 board next steps and add owed follow-ups; (2) Review nomination process docs in shared drive; (3) Brainstorm board candidates (gaps: marketing/pricing, younger demographics, racial/ethnic diversity, spiritual direction); (4) Rest Retreat Sept 8–9 already passed — only if attendance still needs closing. Most Zoom next steps are Elliott/Kim/Sonia.",
  },
];

/** Full initial seed for empty stores (TPFI + merged migrations). */
export const ALL_SEED_REVIEW_NOTIFICATIONS: ReviewNotification[] = [
  ...SEED_REVIEW_NOTIFICATIONS,
  ...MERGED_REVIEW_NOTIFICATIONS,
];

const VALID_STATUSES: ReviewItemStatus[] = [
  "needs_review",
  "done",
  "dismissed",
];

let cachedRaw: string | null = null;
let cachedList: ReviewNotification[] = EMPTY_REVIEW_NOTIFICATIONS;
let seededThisSession = false;

function isRole(value: unknown): value is ReviewRole {
  return (
    typeof value === "string" &&
    ["TPFI", "DeeperRSC", "Myers", "ALO", "KB", "SRF"].includes(value)
  );
}

function isStatus(value: unknown): value is ReviewItemStatus {
  return (
    typeof value === "string" &&
    (VALID_STATUSES as string[]).includes(value)
  );
}

function parseList(raw: string): ReviewNotification[] {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return EMPTY_REVIEW_NOTIFICATIONS;
  const out: ReviewNotification[] = [];
  for (const row of parsed) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (
      typeof r.id !== "string" ||
      !r.id ||
      typeof r.title !== "string" ||
      !isRole(r.role) ||
      typeof r.sourceTitle !== "string" ||
      typeof r.sourceUrl !== "string" ||
      !isStatus(r.status) ||
      typeof r.seededAt !== "string"
    ) {
      continue;
    }
    const item: ReviewNotification = {
      id: r.id,
      title: r.title,
      role: r.role,
      sourceTitle: r.sourceTitle,
      sourceUrl: r.sourceUrl,
      status: r.status,
      seededAt: r.seededAt,
    };
    if (typeof r.summary === "string" && r.summary) {
      item.summary = r.summary;
    }
    out.push(item);
  }
  return out.length === 0 ? EMPTY_REVIEW_NOTIFICATIONS : out;
}

function writeList(list: ReviewNotification[]): void {
  if (typeof window === "undefined") return;
  try {
    const stable =
      list.length === 0 ? EMPTY_REVIEW_NOTIFICATIONS : list.slice();
    const raw = JSON.stringify(stable);
    cachedRaw = raw;
    cachedList = stable;
    window.localStorage.setItem(REVIEW_NOTIFICATIONS_STORAGE_KEY, raw);
    window.dispatchEvent(new Event(REVIEW_NOTIFICATIONS_CHANGE_EVENT));
  } catch {
    // Quota / private mode — ignore.
  }
}

/**
 * Seed when localStorage is empty; otherwise merge any MERGED_REVIEW_NOTIFICATIONS
 * whose ids are not already present (preserves dismissed/done).
 */
export function ensureReviewNotificationsSeeded(): void {
  if (typeof window === "undefined") return;
  if (seededThisSession) return;
  try {
    const existing = window.localStorage.getItem(
      REVIEW_NOTIFICATIONS_STORAGE_KEY,
    );
    if (!existing) {
      writeList(ALL_SEED_REVIEW_NOTIFICATIONS.map((n) => ({ ...n })));
      seededThisSession = true;
      return;
    }
    const list = parseList(existing);
    const ids = new Set(list.map((n) => n.id));
    const toAdd = MERGED_REVIEW_NOTIFICATIONS.filter((n) => !ids.has(n.id));
    if (toAdd.length > 0) {
      writeList([...list, ...toAdd.map((n) => ({ ...n }))]);
    } else {
      // Warm cache for subsequent reads without rewriting storage.
      cachedRaw = existing;
      cachedList = list;
    }
    seededThisSession = true;
  } catch {
    seededThisSession = true;
  }
}

export function readReviewNotifications(): ReviewNotification[] {
  if (typeof window === "undefined") return EMPTY_REVIEW_NOTIFICATIONS;
  try {
    const raw = window.localStorage.getItem(REVIEW_NOTIFICATIONS_STORAGE_KEY);
    if (!raw) {
      cachedRaw = null;
      cachedList = EMPTY_REVIEW_NOTIFICATIONS;
      return EMPTY_REVIEW_NOTIFICATIONS;
    }
    if (raw === cachedRaw) return cachedList;
    const list = parseList(raw);
    cachedRaw = raw;
    cachedList = list;
    return list;
  } catch {
    cachedRaw = null;
    cachedList = EMPTY_REVIEW_NOTIFICATIONS;
    return EMPTY_REVIEW_NOTIFICATIONS;
  }
}

export function getActiveReviewNotifications(): ReviewNotification[] {
  return readReviewNotifications().filter((n) => n.status === "needs_review");
}

export function setReviewNotificationStatus(
  id: string,
  status: ReviewItemStatus,
): void {
  if (!id) return;
  const list = readReviewNotifications().map((n) =>
    n.id === id ? { ...n, status } : n,
  );
  writeList(list);
}

export function dismissReviewNotification(id: string): void {
  setReviewNotificationStatus(id, "dismissed");
}

export function markReviewNotificationDone(id: string): void {
  setReviewNotificationStatus(id, "done");
}

export function subscribeReviewNotifications(
  onStoreChange: () => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => onStoreChange();
  window.addEventListener(REVIEW_NOTIFICATIONS_CHANGE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(REVIEW_NOTIFICATIONS_CHANGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
