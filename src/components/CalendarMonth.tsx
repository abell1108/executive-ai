"use client";

import { useMemo, useState } from "react";
import { buildSeptember2026 } from "@/lib/seed-data";
import type { PillKind } from "@/lib/types";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const pillClass: Record<PillKind, string> = {
  corp: "bg-[rgba(27,54,68,0.08)] text-[rgba(27,54,68,0.55)] border border-[rgba(27,54,68,0.12)] font-medium",
  tpfi: "bg-[rgba(45,106,108,0.16)] text-teal",
  alo: "bg-navy text-white",
  rest: "bg-[#FDE8C8] text-alert-text",
};

const dotClass: Record<PillKind, string> = {
  corp: "bg-[rgba(27,54,68,0.35)]",
  tpfi: "bg-teal",
  alo: "bg-navy",
  rest: "bg-[#D97706]",
};

export function CalendarMonth() {
  const cells = useMemo(() => buildSeptember2026(), []);
  const [cursor] = useState("September 2026");

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-1.5 overflow-hidden">
      <div className="flex flex-shrink-0 flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-lg font-bold tracking-tight text-navy">
            {cursor}
          </h3>
          <p className="mt-0.5 text-[10px] text-navy/55">
            Month grid · dots & event pills · America/New_York
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5" aria-label="Month navigation">
          <button
            type="button"
            className="rounded-[10px] border border-[rgba(27,54,68,0.12)] bg-white px-2.5 py-1.5 text-base font-medium text-navy shadow-sm hover:border-teal hover:text-teal"
            aria-label="Previous month"
          >
            ‹
          </button>
          <button
            type="button"
            className="rounded-[10px] border border-[rgba(27,54,68,0.12)] bg-white px-3 py-1.5 text-xs font-semibold text-navy shadow-sm hover:border-teal hover:text-teal"
          >
            Today
          </button>
          <button
            type="button"
            className="rounded-[10px] border border-[rgba(27,54,68,0.12)] bg-white px-2.5 py-1.5 text-base font-medium text-navy shadow-sm hover:border-teal hover:text-teal"
            aria-label="Next month"
          >
            ›
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="mb-1 grid flex-shrink-0 grid-cols-7 gap-1.5">
          {DOW.map((d) => (
            <span
              key={d}
              className="py-0.5 text-center text-[11px] font-semibold tracking-wide text-navy/55"
            >
              {d}
            </span>
          ))}
        </div>

        <div
          className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 gap-[5px] overflow-hidden"
          role="grid"
          aria-label={cursor}
        >
          {cells.map((cell, i) => (
            <div
              key={`${cell.day}-${i}`}
              className={
                cell.outOfMonth
                  ? "flex h-full min-h-0 flex-col gap-0.5 overflow-hidden rounded-[10px] border border-[rgba(27,54,68,0.08)] bg-[rgba(249,247,242,0.55)] px-1.5 py-1"
                  : cell.isToday
                    ? "flex h-full min-h-0 flex-col gap-0.5 overflow-hidden rounded-[10px] border-2 border-teal bg-[#FFFEF8] px-1.5 py-1 shadow-[0_0_0_1px_rgba(45,106,108,0.12),0_2px_6px_rgba(45,106,108,0.1)]"
                    : "flex h-full min-h-0 flex-col gap-0.5 overflow-hidden rounded-[10px] border border-[rgba(27,54,68,0.14)] bg-[#FFFEF8] px-1.5 py-1 shadow-sm"
              }
            >
              {cell.isToday ? (
                <span className="grid h-[22px] w-[22px] place-items-center self-start rounded-full bg-teal text-[11px] font-bold text-white">
                  {cell.day}
                </span>
              ) : (
                <span
                  className={
                    cell.outOfMonth
                      ? "self-start text-xs font-bold leading-none text-navy/30"
                      : "self-start text-xs font-bold leading-none text-navy"
                  }
                >
                  {cell.day}
                </span>
              )}
              {cell.pills.slice(0, 3).map((p) => (
                <span
                  key={p.label + p.kind}
                  className={`block max-w-full flex-shrink-0 truncate rounded-full px-1.5 py-0.5 text-[8px] font-semibold leading-tight ${pillClass[p.kind]}`}
                >
                  {p.label}
                </span>
              ))}
              {cell.dots.length > 0 && (
                <div className="mt-auto flex flex-wrap gap-[3px] pt-0.5">
                  {cell.dots.map((d, di) => (
                    <i
                      key={di}
                      className={`block h-[5px] w-[5px] rounded-full ${dotClass[d]}`}
                      aria-hidden
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <p className="flex-shrink-0 pb-1 text-[11px] text-navy/55">
        Teal = TPFI · Navy = ALO · Muted = Corporate · Amber = Rest
      </p>
    </div>
  );
}
