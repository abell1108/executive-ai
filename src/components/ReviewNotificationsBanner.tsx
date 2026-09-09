"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useActiveReviewNotifications } from "@/hooks/useReviewNotifications";
import { domainDisplayName } from "@/lib/domain-label";

const COLLAPSED_STORAGE_KEY = "ea-review-notifications-collapsed-v1";

type Props = {
  /** Compact card for mobile home; default is desktop banner. */
  variant?: "desktop" | "mobile";
};

function readCollapsedPreference(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(COLLAPSED_STORAGE_KEY);
    if (raw === null) return false; // default expanded
    return raw === "1" || raw === "true";
  } catch {
    return false;
  }
}

function writeCollapsedPreference(collapsed: boolean) {
  try {
    window.localStorage.setItem(COLLAPSED_STORAGE_KEY, collapsed ? "1" : "0");
  } catch {
    /* ignore quota / private mode */
  }
}

function Chevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`h-4 w-4 flex-shrink-0 text-teal transition-transform duration-200 ${
        expanded ? "rotate-180" : "rotate-0"
      }`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function ReviewNotificationsBanner({ variant = "desktop" }: Props) {
  const { items, dismiss, markDone } = useActiveReviewNotifications();
  const panelId = useId();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(readCollapsedPreference());
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      writeCollapsedPreference(next);
      return next;
    });
  }, []);

  if (items.length === 0) return null;

  const expanded = !collapsed;
  const sourceUrl = items[0]?.sourceUrl;
  const sourceTitle = items[0]?.sourceTitle;
  const roleLabel = domainDisplayName(items[0]?.role ?? "TPFI");

  if (variant === "mobile") {
    return (
      <section
        className="mb-3 rounded-2xl border border-teal/35 bg-white p-4 shadow-sm md:mb-4 md:p-5"
        aria-label="Needs your review"
      >
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-expanded={expanded}
            aria-controls={panelId}
            className="flex min-w-0 flex-1 items-start gap-2 rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/50"
          >
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-teal md:text-[12px]">
                Needs your review
                {collapsed ? (
                  <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-teal px-1.5 text-[10px] font-bold normal-case tracking-normal text-white">
                    {items.length}
                  </span>
                ) : null}
              </p>
              {!collapsed ? (
                <p className="mt-0.5 text-[12px] text-navy/55 md:text-[13px]">
                  {items.length} TPFI action item{items.length === 1 ? "" : "s"} ·{" "}
                  Role: {roleLabel}
                </p>
              ) : null}
            </div>
            <span className="mt-0.5 grid h-7 w-7 flex-shrink-0 place-items-center rounded-full border border-teal/35 bg-[rgba(45,106,108,0.08)]">
              <Chevron expanded={expanded} />
            </span>
          </button>
          {!collapsed && sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 rounded-full border border-teal/40 bg-[rgba(45,106,108,0.08)] px-2.5 py-1 text-[11px] font-semibold text-teal no-underline md:text-[12px]"
            >
              Open Drive
            </a>
          ) : null}
        </div>

        {expanded ? (
          <div id={panelId}>
            {sourceTitle ? (
              <p className="mb-2 mt-2 truncate text-[11px] text-navy/45 md:text-[12px]">
                From: {sourceTitle}
              </p>
            ) : (
              <div className="mt-2" />
            )}
            <ul className="space-y-2 md:space-y-2.5">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-[rgba(27,54,68,0.1)] bg-cream/80 px-3 py-2.5 md:px-3.5 md:py-3"
                >
                  <p className="text-[13px] font-semibold leading-snug text-navy md:text-[14px]">
                    {item.title}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => markDone(item.id)}
                      className="rounded-full bg-teal px-2.5 py-1 text-[11px] font-bold text-white md:text-[12px]"
                    >
                      Mark done
                    </button>
                    <button
                      type="button"
                      onClick={() => dismiss(item.id)}
                      className="rounded-full border border-[rgba(27,54,68,0.18)] bg-white px-2.5 py-1 text-[11px] font-semibold text-navy/70 md:text-[12px]"
                    >
                      Dismiss
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div id={panelId} hidden />
        )}
      </section>
    );
  }

  return (
    <section
      className="rounded-2xl border-2 border-teal/40 bg-[rgba(45,106,108,0.06)] px-4 py-4 shadow-sm sm:px-5 sm:py-5"
      aria-label="Needs your review"
      role="region"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span
            className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-teal text-white"
            aria-hidden
          >
            ✎
          </span>
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-expanded={expanded}
              aria-controls={panelId}
              className="flex w-full items-center gap-2 rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/50"
            >
              <h2 className="font-serif text-[18px] font-bold tracking-tight text-navy sm:text-[20px]">
                Needs your review
              </h2>
              {collapsed ? (
                <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-teal px-1.5 text-[11px] font-bold text-white">
                  {items.length}
                </span>
              ) : null}
              <span className="ml-auto grid h-8 w-8 flex-shrink-0 place-items-center rounded-full border border-teal/40 bg-white shadow-sm sm:ml-1">
                <Chevron expanded={expanded} />
              </span>
            </button>
            {!collapsed ? (
              <>
                <p className="mt-0.5 text-[12px] text-navy/60 sm:text-[13px]">
                  {items.length} action item{items.length === 1 ? "" : "s"} from
                  Drive · Role: {roleLabel}
                </p>
                {sourceTitle ? (
                  <p className="mt-1 truncate text-[11px] text-navy/45 sm:text-[12px]">
                    {sourceTitle}
                  </p>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
        {!collapsed && sourceUrl ? (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-full border border-teal/45 bg-white px-3 py-1.5 text-[12px] font-semibold text-teal no-underline shadow-sm hover:border-teal hover:bg-cream"
          >
            Open Drive doc
          </a>
        ) : null}
      </div>

      {expanded ? (
        <ul
          id={panelId}
          className="mt-3 space-y-2 sm:mt-4 sm:space-y-2.5"
        >
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-2 rounded-xl border border-[rgba(27,54,68,0.12)] bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4"
            >
              <p className="min-w-0 text-[13px] font-semibold leading-snug text-navy sm:text-sm">
                {item.title}
              </p>
              <div className="flex flex-shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => markDone(item.id)}
                  className="rounded-full bg-teal px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#25585a] sm:text-[12px]"
                >
                  Mark done
                </button>
                <button
                  type="button"
                  onClick={() => dismiss(item.id)}
                  className="rounded-full border border-[rgba(27,54,68,0.18)] bg-cream px-3 py-1.5 text-[11px] font-semibold text-navy/70 hover:border-navy/40 sm:text-[12px]"
                >
                  Dismiss
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div id={panelId} hidden />
      )}
    </section>
  );
}
