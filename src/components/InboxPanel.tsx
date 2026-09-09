"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import type { Domain, InboxItem, TriageReviewStatus } from "@/lib/types";
import {
  DEFAULT_TRIAGE_STATUS,
  TRIAGE_STATUS_LABEL,
  TRIAGE_STATUS_ORDER,
  TRIAGE_STATUS_PILL_CLASS,
} from "@/lib/triage-status";
import { useTriageStatusMap } from "@/hooks/useTriageStatus";
import { TriageDetailModal } from "./TriageDetailModal";
import { TriageStatusPill } from "./TriageStatusPill";
import type { ModalTriageItem } from "./EventDetailModal";

type LiveInboxItem = InboxItem & {
  id?: string;
  from?: string;
  date?: string;
  notes?: string;
};

type GmailApiResponse = {
  configured?: boolean;
  authenticated?: boolean;
  source?: "live" | "none";
  items?: LiveInboxItem[];
};

type StatusFilter = "all" | TriageReviewStatus;

export function InboxPanel({ domain }: { domain: Domain }) {
  const { status } = useSession();
  const [liveItems, setLiveItems] = useState<LiveInboxItem[]>([]);
  const [source, setSource] = useState<"live" | "none" | "loading">("loading");
  const [authenticated, setAuthenticated] = useState(false);
  const [selected, setSelected] = useState<ModalTriageItem | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const statusMap = useTriageStatusMap();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/gmail", { cache: "no-store" });
        const data = (await res.json()) as GmailApiResponse;
        if (cancelled) return;
        setAuthenticated(Boolean(data.authenticated));
        if (data.source === "live") {
          setLiveItems(Array.isArray(data.items) ? data.items : []);
          setSource("live");
        } else {
          setLiveItems([]);
          setSource("none");
        }
      } catch {
        if (!cancelled) {
          setLiveItems([]);
          setSource("none");
          setAuthenticated(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [status]);

  const domainItems = useMemo(
    () =>
      domain === "All"
        ? liveItems
        : liveItems.filter((item) => item.domain === domain),
    [domain, liveItems],
  );

  const items = useMemo(() => {
    if (statusFilter === "all") return domainItems;
    return domainItems.filter((item) => {
      const s =
        item.id && item.id in statusMap
          ? statusMap[item.id]!
          : DEFAULT_TRIAGE_STATUS;
      return s === statusFilter;
    });
  }, [domainItems, statusFilter, statusMap]);

  const statusLabel =
    source === "loading"
      ? "Loading…"
      : source === "live"
        ? "Live · Domains"
        : authenticated
          ? "Live · Domains"
          : "Sign in";

  return (
    <div className="relative min-h-0 flex-shrink overflow-hidden rounded-[14px] border border-[rgba(27,54,68,0.12)] bg-white px-3 py-2.5 shadow-sm">
      <span
        className="absolute right-4 top-3.5 grid h-[22px] min-w-[22px] place-items-center rounded-full bg-navy px-1.5 text-[11px] font-bold text-white"
        aria-label={`${items.length} items`}
      >
        {items.length}
      </span>
      <h3 className="mb-1 font-serif text-[13px] font-semibold text-navy">
        Inbox triage
      </h3>
      <p className="mb-1.5 text-[10px] text-navy/55">
        {statusLabel}
        {" · "}
        domain labels only
        {domain !== "All" ? ` · ${domain}` : ""}
      </p>

      <div
        className="-mx-0.5 mb-2 flex gap-1 overflow-x-auto pb-0.5"
        role="toolbar"
        aria-label="Filter by review status"
      >
        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          className={
            statusFilter === "all"
              ? "flex-shrink-0 rounded-full bg-navy px-2.5 py-1 text-[10px] font-bold text-white"
              : "flex-shrink-0 rounded-full border border-[rgba(27,54,68,0.14)] bg-cream px-2.5 py-1 text-[10px] font-semibold text-navy/70 hover:border-teal hover:text-teal"
          }
        >
          All
        </button>
        {TRIAGE_STATUS_ORDER.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={
              statusFilter === s
                ? `flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ring-navy/20 ${TRIAGE_STATUS_PILL_CLASS[s]}`
                : `flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold opacity-80 hover:opacity-100 ${TRIAGE_STATUS_PILL_CLASS[s]}`
            }
            title={TRIAGE_STATUS_LABEL[s]}
          >
            {s === "additional_action" ? "More action" : TRIAGE_STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {items.length === 0 && (
        <p className="py-2 text-xs text-navy/55">
          {source === "loading"
            ? "Loading domain inbox…"
            : source === "live" || authenticated
              ? statusFilter !== "all"
                ? `No items · ${TRIAGE_STATUS_LABEL[statusFilter]}`
                : "No domain inbox items"
              : "Sign in to load domain Gmail"}
        </p>
      )}
      {items.map((item, i) => (
        <div
          key={item.id ?? `${item.title}-${i}`}
          className="group flex w-full items-start gap-2 border-b border-[rgba(27,54,68,0.12)] py-1.5 last:border-b-0 last:pb-0 hover:bg-[rgba(45,106,108,0.04)]"
        >
          <button
            type="button"
            onClick={() =>
              setSelected({
                id: item.id,
                domain: item.domain,
                title: item.title,
                meta: item.meta,
                from: item.from,
                date: item.date,
                notes: item.notes,
              })
            }
            className="flex min-w-0 flex-1 items-start gap-2 text-left"
          >
            <span className="mt-0.5 flex-shrink-0 rounded-full bg-[rgba(45,106,108,0.12)] px-2 py-0.5 text-[10px] font-bold text-teal">
              {item.domain}
            </span>
            <div className="min-w-0 flex-1">
              <strong className="block text-xs font-semibold text-navy group-hover:text-teal">
                {item.title}
              </strong>
              <div className="mt-0.5 text-[10px] text-navy/55">{item.meta}</div>
            </div>
            <span
              className="mt-0.5 flex-shrink-0 text-navy/30 group-hover:text-teal"
              aria-hidden
            >
              ›
            </span>
          </button>
          <div className="mt-0.5 flex-shrink-0">
            <TriageStatusPill messageId={item.id} size="sm" />
          </div>
        </div>
      ))}

      <TriageDetailModal
        open={selected != null}
        onClose={() => setSelected(null)}
        item={selected}
      />
    </div>
  );
}
