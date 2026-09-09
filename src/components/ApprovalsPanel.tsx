"use client";

import { useMemo, useState } from "react";
import type { ApprovalItem, ApprovalStatus, Domain } from "@/lib/types";

type LocalApproval = ApprovalItem & { status: ApprovalStatus };

export function ApprovalsPanel({ domain }: { domain: Domain }) {
  // No seed drafts — empty until real outbound drafts exist.
  const [items, setItems] = useState<LocalApproval[]>([]);

  const visible = useMemo(
    () =>
      domain === "All" ? items : items.filter((item) => item.domain === domain),
    [domain, items],
  );

  const pendingCount = visible.filter((i) => i.status === "pending").length;

  const setStatus = (id: string, status: ApprovalStatus) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item)),
    );
  };

  return (
    <div className="min-h-0 flex-shrink overflow-hidden rounded-[14px] border border-transparent border-l-[5px] border-l-risk-text bg-risk-bg px-3 py-2.5 shadow-sm">
      <h3 className="mb-1 font-serif text-[13px] font-semibold text-risk-text">
        Approval Queue{" "}
        <span className="ml-2 inline-block align-middle rounded-full border border-[rgba(153,27,27,0.25)] bg-white px-2 py-0.5 text-[10px] font-bold text-risk-text">
          {pendingCount > 0
            ? `Needs your OK · ${pendingCount}`
            : "Needs your OK"}
        </span>
      </h3>
      <p className="mb-2 text-[11px] leading-snug text-[rgba(153,27,27,0.85)]">
        Outbound drafts land here first. Approve = you green-light (still does
        not auto-send in MVP). Hold = pause. Nothing goes out without your OK.
      </p>
      {visible.length === 0 && (
        <div className="rounded-lg border border-[rgba(153,27,27,0.15)] bg-white/70 px-3 py-3">
          <p className="text-xs font-semibold text-risk-text">
            Queue clear — nothing waiting
          </p>
          <p className="mt-1 text-[11px] leading-snug text-[rgba(153,27,27,0.75)]">
            When Roxy prepares outbound email replies, invites, or posts,
            they&apos;ll show up here for your OK before anything is sent.
          </p>
        </div>
      )}
      {visible.map((item) => (
        <div
          key={item.id}
          className="border-b border-[rgba(153,27,27,0.12)] py-2 last:border-b-0 last:pb-0"
        >
          <div className="flex items-start gap-2">
            <span
              className={
                item.status === "approved"
                  ? "mt-0.5 flex-shrink-0 rounded-full border border-[rgba(45,106,108,0.35)] bg-white px-2 py-0.5 text-[10px] font-bold text-teal"
                  : item.status === "held"
                    ? "mt-0.5 flex-shrink-0 rounded-full border border-[rgba(180,83,9,0.35)] bg-white px-2 py-0.5 text-[10px] font-bold text-alert-text"
                    : "mt-0.5 flex-shrink-0 rounded-full border border-[rgba(153,27,27,0.2)] bg-white px-2 py-0.5 text-[10px] font-bold text-risk-text"
              }
            >
              {item.status === "approved"
                ? "Approved"
                : item.status === "held"
                  ? "On hold"
                  : "Needs your OK"}
            </span>
            <div className="min-w-0 flex-1">
              <strong className="block text-xs font-semibold text-risk-text">
                {item.title}
              </strong>
              <div className="mt-0.5 text-[10px] text-[rgba(153,27,27,0.7)]">
                {item.domain}
                {item.meta ? ` · ${item.meta}` : ""}
              </div>
              {item.status === "pending" && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setStatus(item.id, "approved")}
                    className="rounded-full bg-navy px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#152b36]"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus(item.id, "held")}
                    className="rounded-full border border-[rgba(153,27,27,0.3)] bg-white px-3 py-1.5 text-[11px] font-bold text-risk-text hover:border-alert-text hover:text-alert-text"
                  >
                    Hold
                  </button>
                </div>
              )}
              {item.status !== "pending" && (
                <button
                  type="button"
                  onClick={() => setStatus(item.id, "pending")}
                  className="mt-2 text-[10px] font-semibold text-[rgba(153,27,27,0.75)] underline-offset-2 hover:underline"
                >
                  Undo
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
