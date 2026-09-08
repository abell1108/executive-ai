"use client";

import { useEffect, useMemo, useState } from "react";
import { AGENDA_DAYS, ALO_TARGET_ISO, RULE_TAGS, WEEK_SUB } from "@/lib/seed-data";
import type { Domain } from "@/lib/types";

function useCountdown(iso: string) {
  const [label, setLabel] = useState("COUNTDOWN —");
  useEffect(() => {
    const tick = () => {
      const ms = new Date(iso).getTime() - Date.now();
      if (ms <= 0) {
        setLabel("NOW");
        return;
      }
      const d = Math.floor(ms / 86400000);
      const h = Math.floor((ms % 86400000) / 3600000);
      setLabel(`COUNTDOWN ${d}D ${h}H`);
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [iso]);
  return label;
}

export function AgendaPanel({ domain }: { domain: Domain }) {
  const countdown = useCountdown(ALO_TARGET_ISO);

  const days = useMemo(() => {
    return AGENDA_DAYS.map((day) => ({
      ...day,
      events:
        domain === "All"
          ? day.events
          : day.events.filter((ev) => ev.domain === domain),
    })).filter((day) => day.events.length > 0);
  }, [domain]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <p className="mb-2 text-xs text-navy/55">
        {WEEK_SUB}
        {domain !== "All" ? ` · filter: ${domain}` : ""}
      </p>
      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto">
        {days.length === 0 && (
          <p className="rounded-xl border border-dashed border-[rgba(27,54,68,0.2)] bg-white px-3 py-4 text-sm text-navy/55">
            No agenda items for {domain} this week.
          </p>
        )}
        {days.map((day) => (
          <div key={day.dateKey} className="mb-2.5">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-navy/55">
              {day.label}
              {day.isToday && (
                <span className="rounded-full bg-[rgba(45,106,108,0.15)] px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide text-teal">
                  Today
                </span>
              )}
              {day.countdown && (
                <span className="ml-auto rounded-full bg-alert-bg px-2 py-0.5 text-[10px] font-bold tracking-wide text-alert-text">
                  {countdown}
                </span>
              )}
            </div>
            {day.events.map((ev) => (
              <div
                key={ev.title}
                className={
                  ev.highlight === "alo"
                    ? "mb-1.5 rounded-xl border border-[rgba(180,83,9,0.2)] border-l-4 border-l-alert-text bg-alert-bg px-2.5 py-2 shadow-sm"
                    : "mb-1.5 rounded-xl border border-[rgba(27,54,68,0.12)] border-l-4 border-l-teal bg-white px-2.5 py-2 shadow-sm"
                }
              >
                <div
                  className={
                    ev.highlight === "alo"
                      ? "text-sm font-semibold text-alert-text"
                      : "text-sm font-semibold text-navy"
                  }
                >
                  {ev.title}
                </div>
                <div
                  className={
                    ev.highlight === "alo"
                      ? "mt-0.5 text-xs text-[rgba(180,83,9,0.75)]"
                      : "mt-0.5 text-xs text-navy/55"
                  }
                >
                  {ev.meta}
                  {ev.domain ? ` · ${ev.domain}` : ""}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-auto flex flex-wrap gap-2 pt-1.5">
        {RULE_TAGS.map((t) => (
          <span
            key={t}
            className="rounded-full border border-[rgba(27,54,68,0.12)] px-3 py-1.5 text-[11px] font-medium text-navy/55"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
