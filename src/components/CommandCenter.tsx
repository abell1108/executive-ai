"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Domain } from "@/lib/types";
import { DOMAINS } from "@/lib/seed-data";
import { canonicalizeDomainParam } from "@/lib/domain-label";
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

const DESK_LEFT_PCT_KEY = "ea-desk-left-pct-v1";
const DEFAULT_LEFT_PCT = 68;
const MIN_LEFT_PCT = 40;
const MAX_LEFT_PCT = 75;
const NUDGE_PCT = 3;

function clampLeftPct(n: number): number {
  return Math.min(MAX_LEFT_PCT, Math.max(MIN_LEFT_PCT, Math.round(n * 10) / 10));
}

function parseDomain(raw: string | null): Domain {
  const canonical = canonicalizeDomainParam(raw);
  if (!canonical) return "All";
  return DOMAINS.includes(canonical as Domain) ? (canonical as Domain) : "All";
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

function readStoredLeftPct(): number {
  if (typeof window === "undefined") return DEFAULT_LEFT_PCT;
  try {
    const raw = window.localStorage.getItem(DESK_LEFT_PCT_KEY);
    if (!raw) return DEFAULT_LEFT_PCT;
    const n = Number(raw);
    if (!Number.isFinite(n)) return DEFAULT_LEFT_PCT;
    return clampLeftPct(n);
  } catch {
    return DEFAULT_LEFT_PCT;
  }
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
  const [leftPct, setLeftPct] = useState(DEFAULT_LEFT_PCT);
  const [dragging, setDragging] = useState(false);
  const [isMd, setIsMd] = useState(false);

  const splitRef = useRef<HTMLDivElement>(null);
  const leftPctRef = useRef(leftPct);
  leftPctRef.current = leftPct;

  useEffect(() => {
    setLeftPct(readStoredLeftPct());
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => setIsMd(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const persistLeftPct = useCallback((pct: number) => {
    const next = clampLeftPct(pct);
    setLeftPct(next);
    try {
      window.localStorage.setItem(DESK_LEFT_PCT_KEY, String(next));
    } catch {
      /* ignore quota / private mode */
    }
  }, []);

  useEffect(() => {
    setDomain(domainParam);
    if (panelParam === "calendar") setView("calendar");
    if (panelParam === "agenda") setView("agenda");
    setHighlight(panelParam);
  }, [domainParam, panelParam]);

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

  useEffect(() => {
    if (!dragging) return;
    const prevUserSelect = document.body.style.userSelect;
    const prevCursor = document.body.style.cursor;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    return () => {
      document.body.style.userSelect = prevUserSelect;
      document.body.style.cursor = prevCursor;
    };
  }, [dragging]);

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

  const updatePctFromClientX = useCallback(
    (clientX: number) => {
      const el = splitRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width < 1) return;
      const pct = ((clientX - rect.left) / rect.width) * 100;
      persistLeftPct(pct);
    },
    [persistLeftPct],
  );

  const onSplitterPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isMd) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    updatePctFromClientX(e.clientX);
  };

  const onSplitterPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    updatePctFromClientX(e.clientX);
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    setDragging(false);
    persistLeftPct(leftPctRef.current);
  };

  const nudgeLeft = (delta: number) => {
    persistLeftPct(leftPctRef.current + delta);
  };

  const ring = (panel: Panel) =>
    highlight === panel
      ? "ring-2 ring-teal ring-offset-2 ring-offset-cream"
      : "";

  const leftTitle =
    view === "calendar" ? "This Month's Calendar" : "This Week's Agenda";

  const leftPaneStyle: CSSProperties | undefined = isMd
    ? {
        width: `${leftPct}%`,
        minWidth: 280,
        maxWidth: `calc(100% - 260px)`,
        flex: "0 0 auto",
      }
    : undefined;

  return (
    <div className="flex min-h-screen flex-col bg-cream text-navy">
      <Header
        activeDomain={domain}
        onDomainChange={onDomainChange}
        onAskRoxy={() => setAskOpen(true)}
      />
      <CollisionBanner />

      <div
        ref={splitRef}
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-3 py-3 sm:gap-0 sm:px-4 md:flex-row md:gap-0"
      >
        <section
          id="desk-left"
          className={`flex min-h-0 min-w-0 flex-col overflow-hidden border-[rgba(27,54,68,0.12)] md:border-r-0 md:pr-1 ${
            highlight === "agenda" || highlight === "calendar"
              ? ring(highlight)
              : ""
          } w-full rounded-xl`}
          style={leftPaneStyle}
          aria-label={leftTitle}
        >
          <div className="mb-2.5 flex flex-shrink-0 flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-serif text-[20px] font-bold tracking-tight text-navy sm:text-[22px]">
                {view === "calendar"
                  ? "This Month\u2019s Calendar"
                  : "This Week\u2019s Agenda"}
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

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize agenda and operations panes"
          aria-valuemin={MIN_LEFT_PCT}
          aria-valuemax={MAX_LEFT_PCT}
          aria-valuenow={Math.round(leftPct)}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") {
              e.preventDefault();
              nudgeLeft(-NUDGE_PCT);
            } else if (e.key === "ArrowRight") {
              e.preventDefault();
              nudgeLeft(NUDGE_PCT);
            }
          }}
          onPointerDown={onSplitterPointerDown}
          onPointerMove={onSplitterPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className={`relative z-10 hidden w-3 flex-shrink-0 cursor-col-resize touch-none select-none flex-col items-center justify-center md:flex ${
            dragging
              ? "bg-[rgba(45,106,108,0.18)]"
              : "bg-transparent hover:bg-[rgba(45,106,108,0.1)]"
          }`}
        >
          <div
            className={`absolute inset-y-2 left-1/2 w-px -translate-x-1/2 ${
              dragging ? "bg-teal" : "bg-[rgba(27,54,68,0.18)]"
            }`}
            aria-hidden
          />
          <div className="relative z-10 flex flex-col items-center gap-0.5 rounded-md border border-[rgba(27,54,68,0.14)] bg-cream px-0.5 py-1 shadow-sm">
            <button
              type="button"
              tabIndex={-1}
              aria-label="Widen left pane"
              onClick={(e) => {
                e.stopPropagation();
                nudgeLeft(NUDGE_PCT);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="rounded px-0.5 text-[10px] leading-none text-navy/60 hover:bg-teal/15 hover:text-teal"
            >
              ◀
            </button>
            <button
              type="button"
              tabIndex={-1}
              aria-label="Widen right pane"
              onClick={(e) => {
                e.stopPropagation();
                nudgeLeft(-NUDGE_PCT);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="rounded px-0.5 text-[10px] leading-none text-navy/60 hover:bg-teal/15 hover:text-teal"
            >
              ▶
            </button>
          </div>
        </div>

        <aside
          className="mt-2 flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto sm:mt-6 sm:gap-2 md:mt-0 md:min-w-[240px] md:pl-1"
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
