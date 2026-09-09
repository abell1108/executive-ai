"use client";

import { useState } from "react";
import type { Domain } from "@/lib/types";
import { Header } from "./Header";
import { CollisionBanner } from "./CollisionBanner";
import { ConnectGoogle } from "./ConnectGoogle";
import { AgendaPanel } from "./AgendaPanel";
import { CalendarMonth } from "./CalendarMonth";
import { InboxPanel } from "./InboxPanel";
import { ApprovalsPanel } from "./ApprovalsPanel";
import { RestGuards } from "./RestGuards";
import { AskRoxy } from "./AskRoxy";

export function CommandCenter({ googleConfigured }: { googleConfigured: boolean }) {
  const [view, setView] = useState<"agenda" | "calendar">("agenda");
  const [domain, setDomain] = useState<Domain>("All");
  const [askOpen, setAskOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-cream text-navy">
      <Header
        activeDomain={domain}
        onDomainChange={setDomain}
        onAskRoxy={() => setAskOpen(true)}
      />
      <ConnectGoogle configured={googleConfigured} />
      <CollisionBanner />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden px-3 py-3 sm:gap-0 sm:px-4 md:grid-cols-[minmax(0,68%)_minmax(240px,32%)]">
        <section
          className="flex min-h-0 flex-col overflow-hidden border-[rgba(27,54,68,0.12)] md:border-r md:pr-3.5"
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
                onClick={() => setView("agenda")}
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
                onClick={() => setView("calendar")}
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
            <CalendarMonth />
          )}
        </section>

        <aside
          className="mt-2 flex min-h-0 flex-col gap-3 overflow-y-auto sm:mt-6 sm:gap-2 md:mt-0 md:pl-3"
          aria-label="EA Operations"
        >
          <p className="flex-shrink-0 text-[10px] font-semibold tracking-wide text-navy/55">
            EA umbrella inbox · not TPFI-owned
          </p>
          <InboxPanel domain={domain} />
          <ApprovalsPanel domain={domain} />
          <RestGuards />
        </aside>
      </div>

      <AskRoxy open={askOpen} onClose={() => setAskOpen(false)} />
    </div>
  );
}
