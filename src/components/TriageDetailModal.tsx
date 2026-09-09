"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ModalTriageItem } from "./EventDetailModal";
import { TriageStatusPill } from "./TriageStatusPill";
import { domainDisplayName } from "@/lib/domain-label";
import { useTriageOverlay, useTriageStatus } from "@/hooks/useTriageStatus";
import { applyTriageOverlay } from "@/lib/triage-overlay";

type DetailResponse = {
  item?: ModalTriageItem;
  error?: string;
};

function fromShort(from?: string, meta?: string): string {
  if (from) return from.replace(/<[^>]+>/, "").trim() || from;
  if (meta) return meta.split("·")[0]?.trim() || meta;
  return "";
}

function gmailOpenUrl(id?: string): string | null {
  if (!id) return null;
  return `https://mail.google.com/mail/u/0/#inbox/${encodeURIComponent(id)}`;
}

export function TriageDetailModal({
  open,
  onClose,
  item,
}: {
  open: boolean;
  onClose: () => void;
  item: ModalTriageItem | null;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [liveNotes, setLiveNotes] = useState<string | undefined>(undefined);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [draftDecision, setDraftDecision] = useState("");

  const [overlay, setOverlay] = useTriageOverlay(item?.id);
  const [status] = useTriageStatus(item?.id);

  // Close when permanently removed from the list.
  useEffect(() => {
    if (!open || !item?.id) return;
    if (status === "removed_from_list") {
      onClose();
    }
  }, [open, item?.id, status, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      if (editing) {
        setEditing(false);
        return;
      }
      onClose();
    };
    // Capture so Escape closes triage without also dismissing parent modals.
    window.addEventListener("keydown", onKey, true);
    const t = window.setTimeout(() => closeRef.current?.focus(), 0);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.clearTimeout(t);
    };
  }, [open, onClose, editing]);

  useEffect(() => {
    if (!open || !item) {
      setLiveNotes(undefined);
      setLoadingNotes(false);
      setEditing(false);
      return;
    }

    let cancelled = false;
    setLiveNotes(item.notes);
    setLoadingNotes(Boolean(item.id));
    setEditing(false);

    async function loadDetail() {
      if (!item?.id) {
        setLoadingNotes(false);
        return;
      }
      try {
        const res = await fetch(
          `/api/gmail/${encodeURIComponent(item.id)}`,
          { cache: "no-store", credentials: "same-origin" },
        );
        if (!res.ok) {
          if (!cancelled) setLoadingNotes(false);
          return;
        }
        const data = (await res.json()) as DetailResponse;
        if (cancelled) return;
        const richer = data.item?.notes?.trim();
        if (richer) setLiveNotes(richer);
      } catch {
        // Keep list snippet fallback.
      } finally {
        if (!cancelled) setLoadingNotes(false);
      }
    }

    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [open, item]);

  if (!open || !item) return null;

  const baseForDisplay = {
    ...item,
    notes: liveNotes !== undefined ? liveNotes : item.notes,
  };
  const displayed = applyTriageOverlay(baseForDisplay, overlay);

  const sender = fromShort(item.from, item.meta);
  const dateLabel = item.date?.trim() || "";
  const metaLine = [sender, dateLabel].filter(Boolean).join(" · ");
  const openUrl = gmailOpenUrl(item.id);
  const displayNotes = displayed.notes?.trim();
  const decisionText = displayed.decisionResponse?.trim();
  const canEditFields = Boolean(item.id);

  const startEdit = () => {
    setDraftTitle(displayed.title);
    setDraftNotes(displayed.notes ?? "");
    setDraftDecision(displayed.decisionResponse ?? "");
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  const saveEdit = () => {
    if (!item.id) return;
    setOverlay({
      title: draftTitle.trim(),
      notes: draftNotes,
      decisionResponse: draftDecision,
    });
    setEditing(false);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-[rgba(27,54,68,0.45)] p-0 max-lg:pt-[env(safe-area-inset-top,0px)] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-[rgba(27,54,68,0.12)] bg-cream shadow-2xl max-lg:pb-[env(safe-area-inset-bottom,0px)] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-shrink-0 items-start justify-between gap-3 border-b border-[rgba(27,54,68,0.12)] px-4 py-3.5 sm:px-5">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[rgba(45,106,108,0.12)] px-2.5 py-0.5 text-[10px] font-bold text-teal">
                {domainDisplayName(item.domain)}
              </span>
              <span className="rounded-full border border-[#D97706]/40 bg-[#FFF8EE] px-2 py-0.5 text-[10px] font-semibold text-[#B45309]">
                Inbox triage
              </span>
            </div>
            {editing ? (
              <label className="block">
                <span className="sr-only">Subject</span>
                <input
                  type="text"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  className="w-full rounded-xl border border-[rgba(27,54,68,0.18)] bg-white px-3 py-2 font-serif text-lg font-bold tracking-tight text-navy shadow-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30 sm:text-xl"
                  aria-label="Edit subject"
                />
              </label>
            ) : (
              <h2
                id={titleId}
                className="font-serif text-lg font-bold tracking-tight text-navy sm:text-xl"
              >
                {displayed.title}
              </h2>
            )}
            {metaLine && (
              <p className="mt-1 text-xs text-navy/55">{metaLine}</p>
            )}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full border border-[rgba(27,54,68,0.14)] bg-white text-navy shadow-sm hover:border-teal hover:text-teal max-lg:h-11 max-lg:w-11"
            aria-label="Close triage details"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden>
              <path strokeLinecap="round" d="M7 7l10 10M17 7 7 17" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
          <div>
            <p className="text-[10px] font-semibold tracking-wide text-navy/55">
              Review status
            </p>
            <div className="mt-1.5">
              <TriageStatusPill messageId={item.id} size="md" />
            </div>
            {!item.id && (
              <p className="mt-1 text-[10px] text-navy/45">
                Status and edits save when a Gmail message id is available.
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold tracking-wide text-navy/55">
                Notes
              </p>
              {canEditFields && !editing && (
                <button
                  type="button"
                  onClick={startEdit}
                  className="rounded-full border border-[rgba(27,54,68,0.14)] bg-white px-2.5 py-1 text-[10px] font-semibold text-navy shadow-sm hover:border-teal hover:text-teal"
                >
                  Edit
                </button>
              )}
            </div>
            {editing ? (
              <textarea
                value={draftNotes}
                onChange={(e) => setDraftNotes(e.target.value)}
                rows={5}
                className="mt-1.5 w-full resize-y rounded-xl border border-[rgba(27,54,68,0.18)] bg-white px-3 py-2 text-sm leading-relaxed text-navy shadow-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                aria-label="Edit notes"
                placeholder="Notes for this item…"
              />
            ) : loadingNotes && !displayNotes ? (
              <p className="mt-1 text-sm text-navy/55">Loading notes…</p>
            ) : displayNotes ? (
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-navy">
                {displayNotes}
              </p>
            ) : (
              <p className="mt-1 text-sm text-navy/55">No notes available</p>
            )}
            {loadingNotes && displayNotes && !editing && (
              <p className="mt-1 text-[10px] text-navy/45">Refreshing notes…</p>
            )}
          </div>

          <div>
            <p className="text-[10px] font-semibold tracking-wide text-navy/55">
              Your decision / response
            </p>
            {editing ? (
              <textarea
                value={draftDecision}
                onChange={(e) => setDraftDecision(e.target.value)}
                rows={3}
                className="mt-1.5 w-full resize-y rounded-xl border border-[rgba(27,54,68,0.18)] bg-white px-3 py-2 text-sm leading-relaxed text-navy shadow-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                aria-label="Edit decision or response"
                placeholder="Decision, reply draft, or follow-up notes…"
              />
            ) : decisionText ? (
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-navy">
                {decisionText}
              </p>
            ) : (
              <p className="mt-1 text-sm text-navy/55">
                {canEditFields
                  ? "No decision saved yet — tap Edit to add one."
                  : "No decision saved"}
              </p>
            )}
          </div>

          {editing && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={saveEdit}
                className="inline-flex items-center rounded-full bg-navy px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#152b36]"
              >
                Save
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="inline-flex items-center rounded-full border border-[rgba(27,54,68,0.14)] bg-white px-4 py-2 text-xs font-semibold text-navy shadow-sm hover:border-teal hover:text-teal"
              >
                Cancel
              </button>
            </div>
          )}

          {openUrl && (
            <a
              href={openUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-full border border-[rgba(27,54,68,0.14)] bg-white px-3.5 py-2 text-xs font-semibold text-navy shadow-sm hover:border-teal hover:text-teal"
            >
              Open in Gmail ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
