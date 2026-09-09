"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import {
  EMPTY_REVIEW_NOTIFICATIONS,
  dismissReviewNotification,
  ensureReviewNotificationsSeeded,
  markReviewNotificationDone,
  readReviewNotifications,
  subscribeReviewNotifications,
  type ReviewNotification,
} from "@/lib/review-notifications";

function getServerSnapshot(): ReviewNotification[] {
  return EMPTY_REVIEW_NOTIFICATIONS;
}

export function useReviewNotifications(): ReviewNotification[] {
  useEffect(() => {
    ensureReviewNotificationsSeeded();
  }, []);

  return useSyncExternalStore(
    subscribeReviewNotifications,
    readReviewNotifications,
    getServerSnapshot,
  );
}

export function useActiveReviewNotifications(): {
  items: ReviewNotification[];
  dismiss: (id: string) => void;
  markDone: (id: string) => void;
} {
  const all = useReviewNotifications();
  const items = useMemo(
    () => all.filter((n) => n.status === "needs_review"),
    [all],
  );
  const dismiss = useCallback((id: string) => {
    dismissReviewNotification(id);
  }, []);
  const markDone = useCallback((id: string) => {
    markReviewNotificationDone(id);
  }, []);
  return { items, dismiss, markDone };
}
