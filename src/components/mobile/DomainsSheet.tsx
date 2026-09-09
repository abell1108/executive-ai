"use client";

import { useEffect, useId } from "react";
import type { Domain } from "@/lib/types";
import { DOMAINS } from "@/lib/seed-data";
import { domainDisplayName } from "@/lib/domain-label";

export function DomainsSheet({
  open,
  onClose,
  activeDomain,
  onDomainChange,
}: {
  open: boolean;
  onClose: () => void;
  activeDomain: Domain;
  onDomainChange: (d: Domain) => void;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(27,54,68,0.45)] sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl border border-[rgba(27,54,68,0.12)] bg-cream p-4 shadow-2xl sm:rounded-2xl md:max-w-xl md:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2
            id={titleId}
            className="font-serif text-lg font-bold text-navy md:text-xl"
          >
            Roles
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[rgba(27,54,68,0.12)] bg-white px-3 py-1.5 text-xs font-semibold text-navy"
          >
            Close
          </button>
        </div>
        <p className="mb-3 text-[12px] text-navy/55 md:text-[13px]">
          Filter Agenda, Inbox, Approvals, and Calendar. No chip scroll on
          mobile — pick one here.
        </p>
        <div className="grid grid-cols-2 gap-2 md:gap-2.5">
          {DOMAINS.map((d) => {
            const selected = activeDomain === d;
            return (
              <button
                key={d}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  onDomainChange(d);
                  onClose();
                }}
                className={
                  selected
                    ? "rounded-xl bg-navy px-3 py-3 text-left text-sm font-semibold text-white"
                    : "rounded-xl border border-[rgba(27,54,68,0.12)] bg-white px-3 py-3 text-left text-sm font-semibold text-navy hover:border-teal hover:text-teal"
                }
              >
                {domainDisplayName(d)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
