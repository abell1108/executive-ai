"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { TriageReviewStatus } from "@/lib/types";
import {
  DEFAULT_TRIAGE_STATUS,
  EMPTY_TRIAGE_REMOVED_MAP,
  EMPTY_TRIAGE_STATUS_MAP,
  readTriageRemovedMap,
  readTriageStatusMap,
  setTriageStatus,
  subscribeTriageRemoved,
  subscribeTriageStatus,
  type TriageRemovedMap,
  type TriageStatusMap,
} from "@/lib/triage-status";
import {
  EMPTY_TRIAGE_OVERLAY_MAP,
  getTriageOverlay,
  readTriageOverlayMap,
  setTriageOverlay,
  subscribeTriageOverlay,
  type TriageItemOverlay,
  type TriageOverlayMap,
} from "@/lib/triage-overlay";

function getServerSnapshot(): TriageStatusMap {
  return EMPTY_TRIAGE_STATUS_MAP;
}

function getRemovedServerSnapshot(): TriageRemovedMap {
  return EMPTY_TRIAGE_REMOVED_MAP;
}

function getOverlayServerSnapshot(): TriageOverlayMap {
  return EMPTY_TRIAGE_OVERLAY_MAP;
}

export function useTriageStatusMap(): TriageStatusMap {
  return useSyncExternalStore(
    subscribeTriageStatus,
    readTriageStatusMap,
    getServerSnapshot,
  );
}

export function useTriageRemovedMap(): TriageRemovedMap {
  return useSyncExternalStore(
    subscribeTriageRemoved,
    readTriageRemovedMap,
    getRemovedServerSnapshot,
  );
}

export function useTriageOverlayMap(): TriageOverlayMap {
  return useSyncExternalStore(
    subscribeTriageOverlay,
    readTriageOverlayMap,
    getOverlayServerSnapshot,
  );
}

export function useTriageStatus(
  id: string | undefined | null,
): [TriageReviewStatus, (next: TriageReviewStatus) => void] {
  const map = useTriageStatusMap();
  const resolved: TriageReviewStatus =
    id && id in map ? map[id]! : DEFAULT_TRIAGE_STATUS;

  const setStatus = useCallback(
    (next: TriageReviewStatus) => {
      setTriageStatus(id, next);
    },
    [id],
  );

  return [resolved, setStatus];
}

export function useTriageOverlay(
  id: string | undefined | null,
): [TriageItemOverlay | undefined, (patch: TriageItemOverlay) => void] {
  const map = useTriageOverlayMap();
  const overlay = id && id in map ? map[id] : undefined;

  const setOverlay = useCallback(
    (patch: TriageItemOverlay) => {
      setTriageOverlay(id, patch);
    },
    [id],
  );

  return [overlay, setOverlay];
}

/** Convenience: read overlay without subscribing to the whole map elsewhere. */
export function peekTriageOverlay(
  id: string | undefined | null,
): TriageItemOverlay | undefined {
  return getTriageOverlay(id);
}
