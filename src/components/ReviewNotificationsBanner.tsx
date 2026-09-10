"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
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

  const roleLabels = useMemo(() => {
    const seen = new Set<string>();
    const labels: string[] = [];
    for (const item of items) {
      const label = domainDisplayName(item.role);
      if (!seen.has(label)) {
        seen.add(label);
        labels.push(label);
      }
    }
    return labels;
  }, [items]);

  const sharedSourceUrl = useMemo(() => {
    if (items.length === 0) return undefined;
    const first = items[0]?.sourceUrl;
    if (!first) return undefined;
    return items.every((i) => i.sourceUrl === first) ? first : undefined;
  }, [items]);

  const sharedSourceTitle = useMemo(() => {
    if (items.length === 0) return undefined;
    const first = items[0]?.sourceTitle;
    if (!first) return undefined;
    return items.every((i) => i.sourceTitle === first) ? first : undefined;
  }, [items]);

  if (items.length === 0) return null;

  const expanded = !collapsed;
  const roleLabelText = roleLabels.join(", ");

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
                  {items.length} action item{items.length === 1 ? "" : "s"} ·{" "}
                  Role{roleLabels.length === 1 ? "" : "s"}: {roleLabelText}
                </p>
              ) : null}
            </div>
            <span className="mt-0.5 grid h-7 w-7 flex-shrink-0 place-items-center rounded-full border border-teal/35 bg-[rgba(45,106,108,0.08)]">
              <Chevron expanded={expanded} />
            </span>
          </button>
          {!collapsed && sharedSourceUrl ? (
            <a
              href={sharedSourceUrl}
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
            {sharedSourceTitle ? (
              <p className="mb-2 mt-2 truncate text-[11px] text-navy/45 md:text-[12px]">
                From: {sharedSourceTitle}
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
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[rgba(45,106,108,0.12)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-teal">
                      {domainDisplayName(item.role)}
                    </span>
                    {!sharedSourceUrl && item.sourceUrl ? (
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-semibold text-teal no-underline"
                      >
                        Open Drive
                      </a>
                    ) : null}
                  </div>
                  <p className="mt-1.5 text-[13px] font-semibold leading-snug text-navy md:text-[14px]">
                    {item.title}
                  </p>
                  {item.summary ? (
                    <p className="mt-1.5 text-[12px] leading-snug text-navy/65 md:text-[13px]">
                      {item.summary}
                    </p>
                  ) : null}
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
                  Drive · Role{roleLabels.length === 1 ? "" : "s"}:{" "}
                  {roleLabelText}
                </p>
                {sharedSourceTitle ? (
                  <p className="mt-1 truncate text-[11px] text-navy/45 sm:text-[12px]">
                    {sharedSourceTitle}
                  </p>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
        {!collapsed && sharedSourceUrl ? (
          <a
            href={sharedSourceUrl}
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
              className="flex flex-col gap-2 rounded-xl border border-[rgba(27,54,68,0.12)] bg-white px-3 py-3 sm:gap-3 sm:px-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[rgba(45,106,108,0.12)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-teal">
                  {domainDisplayName(item.role)}
                </span>
                {!sharedSourceUrl && item.sourceUrl ? (
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12px] font-semibold text-teal no-underline hover:underline"
                  >
                    Open Drive doc
                  </a>
                ) : null}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold leading-snug text-navy sm:text-sm">
                    {item.title}
                  </p>
                  {item.summary ? (
                    <p className="mt-1.5 text-[12px] leading-snug text-navy/65 sm:text-[13px]">
                      {item.summary}
                    </p>
                  ) : null}
                </div>
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
