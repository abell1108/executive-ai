"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { TriageReviewStatus } from "@/lib/types";
import {
  TRIAGE_STATUS_LABEL,
  TRIAGE_STATUS_ORDER,
  TRIAGE_STATUS_PILL_CLASS,
} from "@/lib/triage-status";
import { useTriageStatus } from "@/hooks/useTriageStatus";

type Props = {
  messageId?: string | null;
  /** Larger touch target / label for modal. */
  size?: "sm" | "md";
  className?: string;
  /** When false, show pill only (no picker). */
  editable?: boolean;
};

export function TriageStatusPill({
  messageId,
  size = "sm",
  className = "",
  editable = true,
}: Props) {
  const [status, setStatus] = useTriageStatus(messageId);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const canEdit = editable && Boolean(messageId);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc);
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const label = TRIAGE_STATUS_LABEL[status];
  const pillClass = TRIAGE_STATUS_PILL_CLASS[status];
  const sizeClass =
    size === "md"
      ? "px-2.5 py-1 text-[11px]"
      : "px-2 py-0.5 text-[10px]";

  if (!canEdit) {
    return (
      <span
        className={`inline-flex max-w-full flex-shrink-0 items-center rounded-full font-semibold leading-tight ${sizeClass} ${pillClass} ${className}`}
        title={label}
      >
        <span className="truncate">{label}</span>
      </span>
    );
  }

  return (
    <div ref={rootRef} className={`relative inline-flex flex-shrink-0 ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={`Review status: ${label}. Change status`}
        title={label}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen((v) => !v);
        }}
        onKeyDown={(e) => e.stopPropagation()}
        className={`inline-flex max-w-[11rem] items-center gap-1 rounded-full font-semibold leading-tight shadow-sm transition hover:brightness-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/50 ${sizeClass} ${pillClass}`}
      >
        <span className="truncate">{label}</span>
        <span className="opacity-70" aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Review status"
          className="absolute right-0 z-[70] mt-1 max-h-[min(70vh,320px)] w-[min(100vw-2rem,16rem)] overflow-y-auto rounded-xl border border-[rgba(27,54,68,0.14)] bg-white py-1 shadow-xl sm:left-0 sm:right-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {TRIAGE_STATUS_ORDER.map((s) => {
            const selected = s === status;
            return (
              <li key={s} role="option" aria-selected={selected}>
                <button
                  type="button"
                  className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold text-navy hover:bg-[rgba(45,106,108,0.08)] ${
                    selected ? "bg-[rgba(45,106,108,0.06)]" : ""
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setStatus(s);
                    setOpen(false);
                  }}
                >
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${TRIAGE_STATUS_PILL_CLASS[s]}`}
                  >
                    {TRIAGE_STATUS_LABEL[s]}
                  </span>
                  {selected && (
                    <span className="ml-auto text-teal" aria-hidden>
                      ✓
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
