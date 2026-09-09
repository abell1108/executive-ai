/**
 * Per-item localStorage overlays for editable triage fields + decision responses.
 * Keyed by stable Gmail message id. Merged over live Gmail data at display time.
 */

export const TRIAGE_OVERLAY_STORAGE_KEY = "ea-triage-overlay-v1";
export const TRIAGE_OVERLAY_CHANGE_EVENT = "ea-triage-overlay-change";

export type TriageItemOverlay = {
  /** User-edited subject / title. */
  title?: string;
  /** User-edited notes (overrides Gmail body/snippet when set). */
  notes?: string;
  /** Decision / response / reply text the user entered. */
  decisionResponse?: string;
  updatedAt?: string;
};

export type TriageOverlayMap = Record<string, TriageItemOverlay>;

/** Stable empty snapshot for useSyncExternalStore. */
export const EMPTY_TRIAGE_OVERLAY_MAP: TriageOverlayMap = Object.freeze(
  {},
) as TriageOverlayMap;

let cachedRaw: string | null = null;
let cachedMap: TriageOverlayMap = EMPTY_TRIAGE_OVERLAY_MAP;

function isOverlay(value: unknown): value is TriageItemOverlay {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  if (o.title !== undefined && typeof o.title !== "string") return false;
  if (o.notes !== undefined && typeof o.notes !== "string") return false;
  if (o.decisionResponse !== undefined && typeof o.decisionResponse !== "string")
    return false;
  if (o.updatedAt !== undefined && typeof o.updatedAt !== "string") return false;
  return true;
}

function parseOverlayMap(raw: string): TriageOverlayMap {
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object") return EMPTY_TRIAGE_OVERLAY_MAP;
  const out: TriageOverlayMap = {};
  for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (!id || !isOverlay(value)) continue;
    const entry: TriageItemOverlay = {};
    if (typeof value.title === "string") entry.title = value.title;
    if (typeof value.notes === "string") entry.notes = value.notes;
    if (typeof value.decisionResponse === "string")
      entry.decisionResponse = value.decisionResponse;
    if (typeof value.updatedAt === "string") entry.updatedAt = value.updatedAt;
    if (
      entry.title !== undefined ||
      entry.notes !== undefined ||
      entry.decisionResponse !== undefined
    ) {
      out[id] = entry;
    }
  }
  return Object.keys(out).length === 0 ? EMPTY_TRIAGE_OVERLAY_MAP : out;
}

export function readTriageOverlayMap(): TriageOverlayMap {
  if (typeof window === "undefined") return EMPTY_TRIAGE_OVERLAY_MAP;
  try {
    const raw = window.localStorage.getItem(TRIAGE_OVERLAY_STORAGE_KEY);
    if (!raw) {
      cachedRaw = null;
      cachedMap = EMPTY_TRIAGE_OVERLAY_MAP;
      return EMPTY_TRIAGE_OVERLAY_MAP;
    }
    if (raw === cachedRaw) return cachedMap;
    const map = parseOverlayMap(raw);
    cachedRaw = raw;
    cachedMap = map;
    return map;
  } catch {
    cachedRaw = null;
    cachedMap = EMPTY_TRIAGE_OVERLAY_MAP;
    return EMPTY_TRIAGE_OVERLAY_MAP;
  }
}

function writeTriageOverlayMap(map: TriageOverlayMap): void {
  if (typeof window === "undefined") return;
  try {
    const stable =
      Object.keys(map).length === 0 ? EMPTY_TRIAGE_OVERLAY_MAP : map;
    const raw = JSON.stringify(stable);
    cachedRaw = raw;
    cachedMap = stable;
    window.localStorage.setItem(TRIAGE_OVERLAY_STORAGE_KEY, raw);
    window.dispatchEvent(new Event(TRIAGE_OVERLAY_CHANGE_EVENT));
  } catch {
    // Quota / private mode — ignore.
  }
}

export function getTriageOverlay(
  id: string | undefined | null,
): TriageItemOverlay | undefined {
  if (!id) return undefined;
  return readTriageOverlayMap()[id];
}

export function setTriageOverlay(
  id: string | undefined | null,
  patch: TriageItemOverlay,
): void {
  if (!id) return;
  const map = { ...readTriageOverlayMap() };
  const prev = map[id] ?? {};
  const next: TriageItemOverlay = {
    ...prev,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  // Drop empty fields so live Gmail data / empty UI can show through again.
  if (next.title !== undefined && next.title.trim() === "") delete next.title;
  if (next.notes !== undefined && next.notes.trim() === "") delete next.notes;
  if (
    next.decisionResponse !== undefined &&
    next.decisionResponse.trim() === ""
  ) {
    delete next.decisionResponse;
  }
  // If nothing left but updatedAt, remove the overlay entry entirely.
  if (
    next.title === undefined &&
    next.notes === undefined &&
    next.decisionResponse === undefined
  ) {
    delete map[id];
  } else {
    map[id] = next;
  }
  writeTriageOverlayMap(map);
}

export function subscribeTriageOverlay(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => onStoreChange();
  window.addEventListener(TRIAGE_OVERLAY_CHANGE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(TRIAGE_OVERLAY_CHANGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

/** Merge overlay onto a live triage item for display. */
export function applyTriageOverlay<
  T extends { title: string; notes?: string; id?: string },
>(item: T, overlay?: TriageItemOverlay | null): T & { decisionResponse?: string } {
  if (!overlay) return item;
  return {
    ...item,
    title: overlay.title?.trim() ? overlay.title : item.title,
    notes:
      overlay.notes !== undefined ? overlay.notes : item.notes,
    decisionResponse: overlay.decisionResponse,
  };
}
