"use client";

import { useEffect, useId, useRef } from "react";
import type { Domain } from "@/lib/types";

export type ModalCalEvent = {
  id: string;
  title: string;
  meta: string;
  domain: Domain;
  start: string;
  end: string;
  allDay?: boolean;
  description?: string;
  location?: string;
  htmlLink?: string;
};

export type ModalTriageItem = {
  id?: string;
  domain: Domain;
  title: string;
  meta: string;
  from?: string;
  date?: string;
  notes?: string;
};

function formatDateTimeET(ev: ModalCalEvent): string {
  if (ev.allDay) {
    const key =
      /^\d{4}-\d{2}-\d{2}$/.test(ev.start) ?
        ev.start
      : new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/New_York",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date(ev.start));
    const [y, m, d] = key.split("-").map(Number);
    const label = new Date(Date.UTC(y, m - 1, d, 16, 0, 0)).toLocaleDateString(
      "en-US",
      {
        timeZone: "America/New_York",
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      },
    );
    return `${label} · All day ET`;
  }
  try {
    const start = new Date(ev.start);
    const end = ev.end ? new Date(ev.end) : null;
    const datePart = start.toLocaleDateString("en-US", {
      timeZone: "America/New_York",
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const timeOpts: Intl.DateTimeFormatOptions = {
      timeZone: "America/New_York",
      hour: "numeric",
      minute: "2-digit",
    };
    const s = start.toLocaleTimeString("en-US", timeOpts);
    const e = end ? end.toLocaleTimeString("en-US", timeOpts) : "";
    return e ? `${datePart} · ${s}–${e} ET` : `${datePart} · ${s} ET`;
  } catch {
    return ev.meta || "Timed";
  }
}

function fromShort(from?: string, meta?: string): string {
  if (from) return from.replace(/<[^>]+>/, "").trim() || from;
  if (meta) return meta.split("·")[0]?.trim() || meta;
  return "";
}

function TriageRowButton({
  item,
  highlighted,
  onSelect,
}: {
  item: ModalTriageItem;
  highlighted?: boolean;
  onSelect?: (item: ModalTriageItem) => void;
}) {
  const body = (
    <>
      <span className="mt-0.5 flex-shrink-0 rounded-full bg-[rgba(45,106,108,0.12)] px-2 py-0.5 text-[10px] font-bold text-teal">
        {item.domain}
      </span>
      <div className="min-w-0 flex-1">
        <strong className="block text-xs font-semibold text-navy">
          {item.title}
        </strong>
        <div className="mt-0.5 text-[10px] text-navy/55">
          {fromShort(item.from, item.meta)}
          {item.from || item.meta ? " · " : ""}
          {item.domain}
        </div>
      </div>
      {onSelect && (
        <span className="mt-0.5 flex-shrink-0 text-navy/35" aria-hidden>
          ›
        </span>
      )}
    </>
  );

  if (!onSelect) {
    return (
      <div
        className={
          highlighted
            ? "flex items-start gap-2 rounded-lg border border-[#D97706] bg-[#FDE8C8] px-2 py-2"
            : "flex items-start gap-2 border-b border-[rgba(217,119,6,0.15)] pb-2 last:border-b-0 last:pb-0"
        }
      >
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={
        highlighted
          ? "flex w-full items-start gap-2 rounded-lg border border-[#D97706] bg-[#FDE8C8] px-2 py-2 text-left hover:ring-1 hover:ring-[#D97706]/50"
          : "flex w-full items-start gap-2 rounded-lg border border-transparent px-1 py-1.5 text-left hover:border-[rgba(217,119,6,0.35)] hover:bg-[#FFF8EE]"
      }
    >
      {body}
    </button>
  );
}

export function EventDetailModal({
  open,
  onClose,
  event,
  triage = [],
  onSelectTriage,
}: {
  open: boolean;
  onClose: () => void;
  event: ModalCalEvent | null;
  triage?: ModalTriageItem[];
  onSelectTriage?: (item: ModalTriageItem) => void;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => closeRef.current?.focus(), 0);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [open, onClose]);

  if (!open || !event) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(27,54,68,0.45)] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-[rgba(27,54,68,0.12)] bg-cream shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-shrink-0 items-start justify-between gap-3 border-b border-[rgba(27,54,68,0.12)] px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[rgba(45,106,108,0.12)] px-2.5 py-0.5 text-[10px] font-bold text-teal">
                {event.domain}
              </span>
            </div>
            <h2
              id={titleId}
              className="font-serif text-lg font-bold tracking-tight text-navy sm:text-xl"
            >
              {event.title}
            </h2>
            <p className="mt-1 text-xs text-navy/55">
              {formatDateTimeET(event)}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="flex-shrink-0 rounded-full border border-[rgba(27,54,68,0.12)] bg-white px-3 py-1.5 text-xs font-semibold text-navy hover:border-teal hover:text-teal"
            aria-label="Close event details"
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
          {event.location && (
            <div>
              <p className="text-[10px] font-semibold tracking-wide text-navy/55">
                Location
              </p>
              <p className="mt-0.5 text-sm text-navy">{event.location}</p>
            </div>
          )}

          {event.description && (
            <div>
              <p className="text-[10px] font-semibold tracking-wide text-navy/55">
                Description
              </p>
              <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-navy">
                {event.description}
              </p>
            </div>
          )}

          {event.meta && (
            <div>
              <p className="text-[10px] font-semibold tracking-wide text-navy/55">
                Meta
              </p>
              <p className="mt-0.5 text-sm text-navy/80">{event.meta}</p>
            </div>
          )}

          {event.htmlLink && (
            <a
              href={event.htmlLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-full border border-[rgba(27,54,68,0.14)] bg-white px-3.5 py-2 text-xs font-semibold text-navy shadow-sm hover:border-teal hover:text-teal"
            >
              Open in Google Calendar ↗
            </a>
          )}

          {triage.length > 0 && (
            <div className="rounded-xl border border-[rgba(217,119,6,0.25)] bg-[#FFF8EE] px-3 py-3">
              <h3 className="mb-2 font-serif text-sm font-semibold text-navy">
                Inbox triage for that day / domain
              </h3>
              <ul className="space-y-2">
                {triage.map((item, i) => (
                  <li key={item.id ?? `${item.title}-${i}`}>
                    <TriageRowButton
                      item={item}
                      onSelect={onSelectTriage}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function DaySummaryModal({
  open,
  onClose,
  dayLabel,
  events,
  triage,
  onSelectEvent,
  onSelectTriage,
  highlightTriageId = null,
}: {
  open: boolean;
  onClose: () => void;
  dayLabel: string;
  events: ModalCalEvent[];
  triage: ModalTriageItem[];
  onSelectEvent: (ev: ModalCalEvent) => void;
  onSelectTriage?: (item: ModalTriageItem) => void;
  highlightTriageId?: string | null;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => {
      if (highlightTriageId) {
        document.getElementById("triage-highlight")?.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      } else {
        closeRef.current?.focus();
      }
    }, 0);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [open, onClose, highlightTriageId]);

  if (!open) return null;

  const empty = events.length === 0 && triage.length === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(27,54,68,0.45)] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-[rgba(27,54,68,0.12)] bg-cream shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-shrink-0 items-start justify-between gap-3 border-b border-[rgba(27,54,68,0.12)] px-4 py-3.5 sm:px-5">
          <div>
            <h2
              id={titleId}
              className="font-serif text-lg font-bold tracking-tight text-navy sm:text-xl"
            >
              {dayLabel}
            </h2>
            <p className="mt-0.5 text-xs text-navy/55">
              Domain events · inbox triage · America/New_York
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="flex-shrink-0 rounded-full border border-[rgba(27,54,68,0.12)] bg-white px-3 py-1.5 text-xs font-semibold text-navy hover:border-teal hover:text-teal"
            aria-label="Close day summary"
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
          {empty && (
            <p className="rounded-xl border border-dashed border-[rgba(27,54,68,0.2)] bg-white px-3 py-4 text-sm text-navy/55">
              No domain events or triage for this day.
            </p>
          )}

          {events.length > 0 && (
            <div>
              <h3 className="mb-2 text-[10px] font-semibold tracking-wide text-navy/55">
                Events ({events.length})
              </h3>
              <ul className="space-y-2">
                {events.map((ev) => (
                  <li key={ev.id}>
                    <button
                      type="button"
                      onClick={() => onSelectEvent(ev)}
                      className="flex w-full items-start gap-2 rounded-xl border border-[rgba(27,54,68,0.12)] bg-white px-3 py-2.5 text-left shadow-sm hover:border-teal"
                    >
                      <span className="mt-0.5 flex-shrink-0 rounded-full bg-[rgba(45,106,108,0.12)] px-2 py-0.5 text-[10px] font-bold text-teal">
                        {ev.domain}
                      </span>
                      <div className="min-w-0">
                        <strong className="block text-xs font-semibold text-navy">
                          {ev.title}
                        </strong>
                        <div className="mt-0.5 text-[10px] text-navy/55">
                          {ev.meta}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {triage.length > 0 && (
            <div className="rounded-xl border border-[rgba(217,119,6,0.25)] bg-[#FFF8EE] px-3 py-3">
              <h3 className="mb-2 font-serif text-sm font-semibold text-navy">
                Inbox triage ({triage.length})
              </h3>
              <ul className="space-y-2">
                {triage.map((item, i) => {
                  const key = item.id ?? `${item.title}-${i}`;
                  const highlighted =
                    highlightTriageId != null &&
                    (item.id === highlightTriageId ||
                      item.title === highlightTriageId ||
                      key === highlightTriageId);
                  return (
                    <li
                      key={key}
                      id={highlighted ? "triage-highlight" : undefined}
                    >
                      <TriageRowButton
                        item={item}
                        highlighted={highlighted}
                        onSelect={onSelectTriage}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
