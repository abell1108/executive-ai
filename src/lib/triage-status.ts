import type { TriageReviewStatus } from "@/lib/types";

export const TRIAGE_STATUS_STORAGE_KEY = "ea-triage-status-v1";
export const TRIAGE_STATUS_CHANGE_EVENT = "ea-triage-status-change";

export const DEFAULT_TRIAGE_STATUS: TriageReviewStatus = "not_started";

export const TRIAGE_STATUS_ORDER: TriageReviewStatus[] = [
  "not_started",
  "in_progress",
  "awaiting_action",
  "additional_action",
  "on_hold",
  "completed",
];

export const TRIAGE_STATUS_LABEL: Record<TriageReviewStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  awaiting_action: "Awaiting action",
  additional_action: "Additional action needed",
  on_hold: "On hold",
  completed: "Completed",
};

/** Cream/navy/teal desk — distinct readable pills. */
export const TRIAGE_STATUS_PILL_CLASS: Record<TriageReviewStatus, string> = {
  not_started:
    "border border-[rgba(27,54,68,0.18)] bg-[rgba(27,54,68,0.08)] text-[rgba(27,54,68,0.75)]",
  in_progress:
    "border border-[rgba(45,106,108,0.35)] bg-[rgba(45,106,108,0.14)] text-teal",
  awaiting_action:
    "border border-[#D97706]/45 bg-[#FFF8EE] text-[#B45309]",
  additional_action:
    "border border-[#EA580C]/40 bg-[#FFF1E8] text-[#C2410C]",
  on_hold:
    "border border-[#7C3AED]/35 bg-[#F3E8FF] text-[#6B21A8]",
  completed:
    "border border-[#059669]/35 bg-[#ECFDF5] text-[#047857]",
};

export type TriageStatusMap = Record<string, TriageReviewStatus>;

/** Stable empty snapshot for useSyncExternalStore (never return a fresh {}). */
export const EMPTY_TRIAGE_STATUS_MAP: TriageStatusMap = Object.freeze(
  {},
) as TriageStatusMap;

let cachedRaw: string | null = null;
let cachedMap: TriageStatusMap = EMPTY_TRIAGE_STATUS_MAP;

function isStatus(value: unknown): value is TriageReviewStatus {
  return (
    typeof value === "string" &&
    (TRIAGE_STATUS_ORDER as string[]).includes(value)
  );
}

function parseTriageStatusMap(raw: string): TriageStatusMap {
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object") return EMPTY_TRIAGE_STATUS_MAP;
  const out: TriageStatusMap = {};
  for (const [id, status] of Object.entries(parsed as Record<string, unknown>)) {
    if (id && isStatus(status)) out[id] = status;
  }
  return Object.keys(out).length === 0 ? EMPTY_TRIAGE_STATUS_MAP : out;
}

export function readTriageStatusMap(): TriageStatusMap {
  if (typeof window === "undefined") return EMPTY_TRIAGE_STATUS_MAP;
  try {
    const raw = window.localStorage.getItem(TRIAGE_STATUS_STORAGE_KEY);
    if (!raw) {
      cachedRaw = null;
      cachedMap = EMPTY_TRIAGE_STATUS_MAP;
      return EMPTY_TRIAGE_STATUS_MAP;
    }
    if (raw === cachedRaw) {
      return cachedMap;
    }
    const map = parseTriageStatusMap(raw);
    cachedRaw = raw;
    cachedMap = map;
    return map;
  } catch {
    cachedRaw = null;
    cachedMap = EMPTY_TRIAGE_STATUS_MAP;
    return EMPTY_TRIAGE_STATUS_MAP;
  }
}

function writeTriageStatusMap(map: TriageStatusMap): void {
  if (typeof window === "undefined") return;
  try {
    const stable =
      Object.keys(map).length === 0 ? EMPTY_TRIAGE_STATUS_MAP : map;
    const raw = JSON.stringify(stable);
    // Cache before dispatch so getSnapshot returns a stable reference.
    cachedRaw = raw;
    cachedMap = stable;
    window.localStorage.setItem(TRIAGE_STATUS_STORAGE_KEY, raw);
    window.dispatchEvent(new Event(TRIAGE_STATUS_CHANGE_EVENT));
  } catch {
    // Quota / private mode — ignore.
  }
}

export function getTriageStatus(id: string | undefined | null): TriageReviewStatus {
  if (!id) return DEFAULT_TRIAGE_STATUS;
  return readTriageStatusMap()[id] ?? DEFAULT_TRIAGE_STATUS;
}

export function setTriageStatus(
  id: string | undefined | null,
  status: TriageReviewStatus,
): void {
  if (!id) return;
  // Clone — never mutate the cached / frozen snapshot.
  const map = { ...readTriageStatusMap() };
  if (status === DEFAULT_TRIAGE_STATUS) {
    if (!(id in map)) return;
    delete map[id];
  } else {
    map[id] = status;
  }
  writeTriageStatusMap(map);
}

export function subscribeTriageStatus(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => onStoreChange();
  window.addEventListener(TRIAGE_STATUS_CHANGE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(TRIAGE_STATUS_CHANGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
