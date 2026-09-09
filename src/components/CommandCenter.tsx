"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Domain } from "@/lib/types";
import { DOMAINS } from "@/lib/seed-data";
import { Header } from "./Header";
import { CollisionBanner } from "./CollisionBanner";
import { AgendaPanel } from "./AgendaPanel";
import { CalendarMonth } from "./CalendarMonth";
import { InboxPanel } from "./InboxPanel";
import { ApprovalsPanel } from "./ApprovalsPanel";
import { RestGuards } from "./RestGuards";
import { AskRoxy } from "./AskRoxy";

type LeftView = "agenda" | "calendar";
type Panel = "agenda" | "inbox" | "approvals" | "calendar" | "rest";

function parseDomain(raw: string | null): Domain {
  if (!raw) return "All";
  return DOMAINS.includes(raw as Domain) ? (raw as Domain) : "All";
}

function parsePanel(raw: string | null): Panel | null {
  if (
    raw === "agenda" ||
    raw === "inbox" ||
    raw === "approvals" ||
    raw === "calendar" ||
    raw === "rest"
  ) {
    return raw;
  }
  return null;
}

export function CommandCenter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const panelParam = parsePanel(searchParams.get("panel"));
  const domainParam = parseDomain(searchParams.get("domain"));

  const [view, setView] = useState<LeftView>(
    panelParam === "calendar" ? "calendar" : "agenda",
  );
  const [domain, setDomain] = useState<Domain>(domainParam);
  const [askOpen, setAskOpen] = useState(false);
  const [highlight, setHighlight] = useState<Panel | null>(panelParam);

  // Sync from URL when query changes (e.g. snap-card navigation).
  useEffect(() => {
    setDomain(domainParam);
    if (panelParam === "calendar") setView("calendar");
    if (panelParam === "agenda") setView("agenda");
    setHighlight(panelParam);
  }, [domainParam, panelParam]);

  // Scroll / focus the target panel after mount or param change.
  useEffect(() => {
    if (!panelParam) return;
    const id =
      panelParam === "inbox"
        ? "desk-inbox"
        : panelParam === "approvals"
          ? "desk-approvals"
          : panelParam === "rest"
            ? "desk-rest"
            : panelParam === "agenda" || panelParam === "calendar"
              ? "desk-left"
              : null;
    if (!id) return;
    const t = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
    return () => window.clearTimeout(t);
  }, [panelParam]);

  const writeQuery = useCallback(
    (next: { panel?: Panel | null; domain?: Domain }) => {
      const params = new URLSearchParams(searchParams.toString());
      const panel = next.panel === undefined ? panelParam : next.panel;
      const dom = next.domain === undefined ? domain : next.domain;
      if (panel) params.set("panel", panel);
      else params.delete("panel");
      if (dom && dom !== "All") params.set("domain", dom);
      else params.delete("domain");
      const qs = params.toString();
      router.replace(qs ? `/desk?${qs}` : "/desk", { scroll: false });
    },
    [router, searchParams, panelParam, domain],
  );

  const onDomainChange = (d: Domain) => {
    setDomain(d);
    writeQuery({ domain: d });
  };

  const onViewChange = (v: LeftView) => {
    setView(v);
    setHighlight(v);
    writeQuery({ panel: v });
  };

  const ring = (panel: Panel) =>
    highlight === panel
      ? "ring-2 ring-teal ring-offset-2 ring-offset-cream"
      : "";

  return (
    <div className="flex min-h-screen flex-col bg-cream text-navy">
      <Header
        activeDomain={domain}
        onDomainChange={onDomainChange}
        onAskRoxy={() => setAskOpen(true)}
      />
      <CollisionBanner />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden px-3 py-3 sm:gap-0 sm:px-4 md:grid-cols-[minmax(0,68%)_minmax(240px,32%)]">
        <section
          id="desk-left"
          className={`flex min-h-0 flex-col overflow-hidden border-[rgba(27,54,68,0.12)] md:border-r md:pr-3.5 ${
            highlight === "agenda" || highlight === "calendar" ? ring(highlight) : ""
          } rounded-xl`}
          aria-label="This Week's Agenda"
        >
          <div className="mb-2.5 flex flex-shrink-0 flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-serif text-[20px] font-bold tracking-tight text-navy sm:text-[22px]">
                This Week&apos;s Agenda
              </h2>
            </div>
            <div
              className="inline-flex rounded-[10px] border border-[rgba(27,54,68,0.12)] bg-[rgba(27,54,68,0.06)] p-0.5"
              role="tablist"
              aria-label="Agenda or Calendar view"
            >
              <button
                type="button"
                role="tab"
                aria-selected={view === "agenda"}
                onClick={() => onViewChange("agenda")}
                className={
                  view === "agenda"
                    ? "rounded-lg bg-white px-4 py-1.5 text-xs font-semibold text-navy shadow-sm"
                    : "rounded-lg px-4 py-1.5 text-xs font-semibold text-navy/55"
                }
              >
                Agenda
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === "calendar"}
                onClick={() => onViewChange("calendar")}
                className={
                  view === "calendar"
                    ? "rounded-lg bg-white px-4 py-1.5 text-xs font-semibold text-navy shadow-sm"
                    : "rounded-lg px-4 py-1.5 text-xs font-semibold text-navy/55"
                }
              >
                Calendar
              </button>
            </div>
          </div>

          {view === "agenda" ? (
            <AgendaPanel domain={domain} />
          ) : (
            <CalendarMonth domain={domain} />
          )}
        </section>

        <aside
          className="mt-2 flex min-h-0 flex-col gap-3 overflow-y-auto sm:mt-6 sm:gap-2 md:mt-0 md:pl-3"
          aria-label="EA Operations"
        >
          <p className="flex-shrink-0 text-[10px] font-semibold tracking-wide text-navy/55">
            EA umbrella inbox · not TPFI-owned
          </p>
          <div
            id="desk-inbox"
            className={`rounded-[14px] transition ${ring("inbox")}`}
          >
            <InboxPanel domain={domain} />
          </div>
          <div
            id="desk-approvals"
            className={`rounded-[14px] transition ${ring("approvals")}`}
          >
            <ApprovalsPanel domain={domain} />
          </div>
          <div
            id="desk-rest"
            className={`rounded-[14px] transition ${ring("rest")}`}
          >
            <RestGuards />
          </div>
        </aside>
      </div>

      <AskRoxy open={askOpen} onClose={() => setAskOpen(false)} />
    </div>
  );
}
