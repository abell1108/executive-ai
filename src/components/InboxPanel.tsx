"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import type { Domain, InboxItem } from "@/lib/types";

type LiveInboxItem = InboxItem & { id?: string; from?: string; date?: string };

type GmailApiResponse = {
  configured?: boolean;
  authenticated?: boolean;
  source?: "live" | "none";
  items?: LiveInboxItem[];
};

export function InboxPanel({ domain }: { domain: Domain }) {
  const { status } = useSession();
  const [liveItems, setLiveItems] = useState<LiveInboxItem[]>([]);
  const [source, setSource] = useState<"live" | "none" | "loading">("loading");
  const [authenticated, setAuthenticated] = useState(false);

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

  const items = useMemo(
    () =>
      domain === "All"
        ? liveItems
        : liveItems.filter((item) => item.domain === domain),
    [domain, liveItems],
  );

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
      {items.length === 0 && (
        <p className="py-2 text-xs text-navy/55">
          {source === "loading"
            ? "Loading domain inbox…"
            : source === "live" || authenticated
              ? "No domain inbox items"
              : "Sign in to load domain Gmail"}
        </p>
      )}
      {items.map((item, i) => (
        <div
          key={item.id ?? `${item.title}-${i}`}
          className="flex items-start gap-2 border-b border-[rgba(27,54,68,0.12)] py-1.5 last:border-b-0 last:pb-0"
        >
          <span className="mt-0.5 flex-shrink-0 rounded-full bg-[rgba(45,106,108,0.12)] px-2 py-0.5 text-[10px] font-bold text-teal">
            {item.domain}
          </span>
          <div>
            <strong className="block text-xs font-semibold text-navy">
              {item.title}
            </strong>
            <div className="mt-0.5 text-[10px] text-navy/55">{item.meta}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
