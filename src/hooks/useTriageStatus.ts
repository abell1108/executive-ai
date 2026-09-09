"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { TriageReviewStatus } from "@/lib/types";
import {
  DEFAULT_TRIAGE_STATUS,
  EMPTY_TRIAGE_STATUS_MAP,
  readTriageStatusMap,
  setTriageStatus,
  subscribeTriageStatus,
  type TriageStatusMap,
} from "@/lib/triage-status";

function getServerSnapshot(): TriageStatusMap {
  return EMPTY_TRIAGE_STATUS_MAP;
}

export function useTriageStatusMap(): TriageStatusMap {
  return useSyncExternalStore(
    subscribeTriageStatus,
    readTriageStatusMap,
    getServerSnapshot,
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
