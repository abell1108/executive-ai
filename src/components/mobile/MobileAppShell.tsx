"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import type { Domain } from "@/lib/types";
import { canonicalizeDomainParam, domainDisplayName } from "@/lib/domain-label";
import { DOMAINS } from "@/lib/seed-data";
import { AgendaPanel } from "@/components/AgendaPanel";
import { InboxPanel } from "@/components/InboxPanel";
import { ApprovalsPanel } from "@/components/ApprovalsPanel";
import { AskRoxy } from "@/components/AskRoxy";
import { MobileTabBar, type MobileTab } from "./MobileTabBar";
import { MobileHome } from "./MobileHome";
import { MobileMore, type MoreSubview } from "./MobileMore";
import { DomainsSheet } from "./DomainsSheet";

const TAB_IDS: MobileTab[] = [
  "home",
  "agenda",
  "inbox",
  "approvals",
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
  if (panel === "approvals") return { tab: "approvals" };
  if (panel === "calendar") return { tab: "more", more: "calendar" };
  if (panel === "rest") return { tab: "more", more: "rest" };
  return { tab: "home" };
}

function tabToPanel(
  tab: MobileTab,
  more: MoreSubview,
): string | null {
  if (tab === "agenda") return "agenda";
  if (tab === "inbox") return "inbox";
  if (tab === "approvals") return "approvals";
  if (tab === "more" && more === "calendar") return "calendar";
  if (tab === "more" && more === "rest") return "rest";
  return null;
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

  const tabFromQuery = parseTab(searchParams.get("tab"));
  const panelParam = searchParams.get("panel");
  const domainParam = parseDomain(searchParams.get("domain"));
  const mapped = panelToTab(panelParam);

  const [tab, setTab] = useState<MobileTab>(
    tabFromQuery ?? (onDesk ? mapped.tab : null) ?? initialTab ?? "home",
  );
  const [moreSubview, setMoreSubview] = useState<MoreSubview>(
    mapped.more ?? "menu",
  );
  const [domain, setDomain] = useState<Domain>(domainParam);
  const [domainsOpen, setDomainsOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [inboxBadge, setInboxBadge] = useState<number | null>(null);

  useEffect(() => {
    const t = parseTab(searchParams.get("tab"));
    if (t) {
      setTab(t);
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
          setInboxBadge(data.items.length);
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
  }, [status, tab]);

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
        if (nextTab === "home") params.delete("tab");
        else params.set("tab", nextTab);
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
        className="mb-2 inline-flex items-center gap-1 rounded-full border border-teal/30 bg-[rgba(45,106,108,0.08)] px-2.5 py-1 text-[11px] font-semibold text-teal"
      >
        Domain · {domainDisplayName(domain)}
        <span aria-hidden>▾</span>
      </button>
    ) : null;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-cream text-navy lg:hidden">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col overflow-y-auto pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))]">
        {tab === "home" ? <MobileHome onNavigate={onTabChange} /> : null}

        {tab === "agenda" ? (
          <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-2">
            <h1 className="mb-1 font-serif text-[24px] font-bold text-navy">
              This Week&apos;s Agenda
            </h1>
            {domainHint}
            <AgendaPanel domain={domain} />
          </div>
        ) : null}

        {tab === "inbox" ? (
          <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-2">
            <div className="mb-2 flex items-start justify-between gap-2">
              <h1 className="font-serif text-[24px] font-bold text-navy">
                Inbox triage
              </h1>
              <button
                type="button"
                onClick={() => setDomainsOpen(true)}
                className="inline-flex items-center gap-1 pt-1 text-[12px] font-semibold text-teal"
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

        {tab === "approvals" ? (
          <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-2">
            <h1 className="font-serif text-[24px] font-bold text-navy">
              Approval Queue
            </h1>
            <p className="mb-3 text-[13px] text-navy/55">
              Nothing sends without your OK.
            </p>
            {domainHint}
            <ApprovalsPanel domain={domain} />
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
