"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import type { Domain } from "@/lib/types";
import { canonicalizeDomainParam, domainDisplayName } from "@/lib/domain-label";
import { DOMAINS } from "@/lib/seed-data";
import { AgendaPanel } from "@/components/AgendaPanel";
import { InboxPanel } from "@/components/InboxPanel";
import { CalendarMonth } from "@/components/CalendarMonth";
import { AskRoxy } from "@/components/AskRoxy";
import { MobileTabBar, type MobileTab } from "./MobileTabBar";
import { MobileHome } from "./MobileHome";
import { MobileMore, type MoreSubview } from "./MobileMore";
import { DomainsSheet } from "./DomainsSheet";
import { useTriageRemovedMap } from "@/hooks/useTriageStatus";

const TAB_IDS: MobileTab[] = [
  "home",
  "agenda",
  "inbox",
  "calendar",
  "more",
];

function parseTab(raw: string | null | undefined): MobileTab | null {
  if (!raw) return null;
  return TAB_IDS.includes(raw as MobileTab) ? (raw as MobileTab) : null;
}

function panelToTab(panel: string | null): {
  tab: MobileTab;
  more?: MoreSubview;
} {
  if (panel === "agenda") return { tab: "agenda" };
  if (panel === "inbox") return { tab: "inbox" };
  if (panel === "calendar") return { tab: "calendar" };
  if (panel === "approvals") return { tab: "more", more: "approvals" };
  if (panel === "rest") return { tab: "more", more: "rest" };
  return { tab: "home" };
}

function tabToPanel(
  tab: MobileTab,
  more: MoreSubview,
): string | null {
  if (tab === "agenda") return "agenda";
  if (tab === "inbox") return "inbox";
  if (tab === "calendar") return "calendar";
  if (tab === "more" && more === "approvals") return "approvals";
  if (tab === "more" && more === "rest") return "rest";
  return null;
}

/** Home-route ?tab= encoding for More subviews that are not primary tabs. */
function tabQueryValue(tab: MobileTab, more: MoreSubview): string | null {
  if (tab === "home") return null;
  if (tab === "more" && more === "approvals") return "approvals";
  if (tab === "more" && more === "rest") return "more";
  return tab;
}

function parseDomain(raw: string | null): Domain {
  const canonical = canonicalizeDomainParam(raw);
  if (!canonical) return "All";
  return DOMAINS.includes(canonical as Domain) ? (canonical as Domain) : "All";
}

export function MobileAppShell({
  initialTab,
}: {
  /** Preferred starting tab when no ?tab= / ?panel= is present. */
  initialTab?: MobileTab;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const onDesk = pathname.startsWith("/desk");

  const rawTab = searchParams.get("tab");
  const tabFromQuery = parseTab(rawTab);
  const panelParam = searchParams.get("panel");
  const domainParam = parseDomain(searchParams.get("domain"));
  const mapped = panelToTab(panelParam);

  const initialFromApprovalsTab =
    rawTab === "approvals"
      ? ({ tab: "more" as MobileTab, more: "approvals" as MoreSubview })
      : null;

  const [tab, setTab] = useState<MobileTab>(
    tabFromQuery ??
      initialFromApprovalsTab?.tab ??
      (onDesk ? mapped.tab : null) ??
      initialTab ??
      "home",
  );
  const [moreSubview, setMoreSubview] = useState<MoreSubview>(
    initialFromApprovalsTab?.more ?? mapped.more ?? "menu",
  );
  const [domain, setDomain] = useState<Domain>(domainParam);
  const [domainsOpen, setDomainsOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [inboxBadge, setInboxBadge] = useState<number | null>(null);
  const removedMap = useTriageRemovedMap();

  useEffect(() => {
    const raw = searchParams.get("tab");
    const t = parseTab(raw);
    if (t) {
      setTab(t);
      if (t !== "more") setMoreSubview("menu");
      return;
    }
    if (raw === "approvals") {
      setTab("more");
      setMoreSubview("approvals");
      return;
    }
    const panel = searchParams.get("panel");
    if (panel) {
      const m = panelToTab(panel);
      setTab(m.tab);
      if (m.more) setMoreSubview(m.more);
    }
  }, [searchParams]);

  useEffect(() => {
    setDomain(domainParam);
  }, [domainParam]);

  useEffect(() => {
    let cancelled = false;
    async function loadBadge() {
      try {
        const res = await fetch("/api/gmail", { cache: "no-store" });
        const data = (await res.json()) as {
          source?: string;
          items?: unknown[];
        };
        if (cancelled) return;
        if (data.source === "live" && Array.isArray(data.items)) {
          const visible = data.items.filter((row) => {
            const id =
              row && typeof row === "object" && "id" in row
                ? (row as { id?: unknown }).id
                : undefined;
            return typeof id !== "string" || !(id in removedMap);
          });
          setInboxBadge(visible.length);
        } else {
          setInboxBadge(null);
        }
      } catch {
        if (!cancelled) setInboxBadge(null);
      }
    }
    void loadBadge();
    return () => {
      cancelled = true;
    };
  }, [status, tab, removedMap]);

  const writeQuery = useCallback(
    (nextTab: MobileTab, nextDomain: Domain, nextMore: MoreSubview) => {
      const params = new URLSearchParams(searchParams.toString());
      if (onDesk) {
        params.delete("tab");
        const panel = tabToPanel(nextTab, nextMore);
        if (panel) params.set("panel", panel);
        else params.delete("panel");
      } else {
        params.delete("panel");
        const q = tabQueryValue(nextTab, nextMore);
        if (q) params.set("tab", q);
        else params.delete("tab");
      }
      if (nextDomain && nextDomain !== "All") params.set("domain", nextDomain);
      else params.delete("domain");
      const qs = params.toString();
      const base = onDesk ? "/desk" : "/";
      router.replace(qs ? `${base}?${qs}` : base, { scroll: false });
    },
    [router, searchParams, onDesk],
  );

  const onTabChange = (next: MobileTab) => {
    const nextMore = next === "more" ? moreSubview : "menu";
    if (next !== "more") setMoreSubview("menu");
    setTab(next);
    writeQuery(next, domain, nextMore);
  };

  const onNavigate = (next: MobileTab, opts?: { more?: MoreSubview }) => {
    const nextMore =
      opts?.more ?? (next === "more" ? moreSubview : "menu");
    if (opts?.more) setMoreSubview(opts.more);
    else if (next !== "more") setMoreSubview("menu");
    setTab(next);
    writeQuery(next, domain, nextMore);
  };

  const onMoreSubview = (v: MoreSubview) => {
    setMoreSubview(v);
    writeQuery(tab, domain, v);
  };

  const onDomainChange = (d: Domain) => {
    setDomain(d);
    writeQuery(tab, d, moreSubview);
  };

  const domainHint =
    domain !== "All" ? (
      <button
        type="button"
        onClick={() => setDomainsOpen(true)}
        className="mb-2 inline-flex items-center gap-1 rounded-full border border-teal/30 bg-[rgba(45,106,108,0.08)] px-2.5 py-1 text-[11px] font-semibold text-teal md:px-3 md:py-1.5 md:text-[12px]"
      >
        Role · {domainDisplayName(domain)}
        <span aria-hidden>▾</span>
      </button>
    ) : null;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-cream text-navy lg:hidden">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col overflow-y-auto pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))] md:max-w-2xl md:pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))]">
        {tab === "home" ? <MobileHome onNavigate={onNavigate} /> : null}

        {tab === "agenda" ? (
          <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-2 md:px-6 md:pb-6 md:pt-4">
            <h1 className="mb-1 font-serif text-[24px] font-bold text-navy md:mb-2 md:text-[28px]">
              This Week&apos;s Agenda
            </h1>
            {domainHint}
            <AgendaPanel domain={domain} />
          </div>
        ) : null}

        {tab === "inbox" ? (
          <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-2 md:px-6 md:pb-6 md:pt-4">
            <div className="mb-2 flex items-start justify-between gap-2">
              <h1 className="font-serif text-[24px] font-bold text-navy md:text-[28px]">
                Inbox triage
              </h1>
              <button
                type="button"
                onClick={() => setDomainsOpen(true)}
                className="inline-flex items-center gap-1 pt-1 text-[12px] font-semibold text-teal md:text-[13px]"
              >
                Filter
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6h16M7 12h10M10 18h4"
                  />
                </svg>
              </button>
            </div>
            {domainHint}
            <InboxPanel domain={domain} />
          </div>
        ) : null}

        {tab === "calendar" ? (
          <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-2 md:px-6 md:pb-6 md:pt-4">
            <h1 className="mb-3 font-serif text-[24px] font-bold text-navy md:mb-4 md:text-[28px]">
              This Month&apos;s Calendar
            </h1>
            {domainHint}
            <div className="min-h-0 flex-1 overflow-y-auto">
              <CalendarMonth domain={domain} />
            </div>
          </div>
        ) : null}

        {tab === "more" ? (
          <MobileMore
            subview={moreSubview}
            onSubview={onMoreSubview}
            domain={domain}
            onOpenDomains={() => setDomainsOpen(true)}
            onAskRoxy={() => setAskOpen(true)}
          />
        ) : null}
      </main>

      <MobileTabBar
        active={tab}
        onChange={onTabChange}
        inboxBadge={inboxBadge}
      />

      <DomainsSheet
        open={domainsOpen}
        onClose={() => setDomainsOpen(false)}
        activeDomain={domain}
        onDomainChange={onDomainChange}
      />

      <AskRoxy open={askOpen} onClose={() => setAskOpen(false)} />
    </div>
  );
}
