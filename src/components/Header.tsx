"use client";

import Link from "next/link";
import type { Domain } from "@/lib/types";
import { DOMAINS } from "@/lib/seed-data";

export function Header({
  activeDomain,
  onDomainChange,
  onAskRoxy,
}: {
  activeDomain: Domain;
  onDomainChange: (d: Domain) => void;
  onAskRoxy: () => void;
}) {
  return (
    <header className="flex flex-wrap items-center gap-5 border-b border-[rgba(27,54,68,0.12)] bg-cream px-6 py-4">
      <div className="min-w-[200px] flex-shrink-0">
        <h1 className="font-serif text-[22px] font-bold tracking-tight text-navy">
          Alisa EA Command Center
        </h1>
        <p className="mt-0.5 text-xs text-navy/55">
          Operated by Roxy · B+C
        </p>
      </div>

      <nav
        className="flex flex-1 flex-wrap items-center justify-center gap-2"
        aria-label="Domain filters"
      >
        <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-navy/55">
          Domains
        </span>
        {DOMAINS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onDomainChange(d)}
            aria-pressed={activeDomain === d}
            className={
              activeDomain === d
                ? "rounded-full border border-navy bg-navy px-3.5 py-1.5 text-xs font-semibold text-white"
                : "rounded-full border border-[rgba(27,54,68,0.12)] bg-white px-3.5 py-1.5 text-xs font-semibold text-navy hover:border-teal hover:text-teal"
            }
          >
            {d}
          </button>
        ))}
      </nav>

      <div className="flex flex-shrink-0 items-center gap-2">
        <Link
          href="/settings"
          className="whitespace-nowrap rounded-full border border-[rgba(27,54,68,0.12)] bg-white px-4 py-2 text-[12px] font-semibold text-navy shadow-sm hover:border-teal hover:text-teal"
        >
          Settings
        </Link>
        <button
          type="button"
          onClick={onAskRoxy}
          className="whitespace-nowrap rounded-full bg-navy px-5 py-2.5 text-[13px] font-bold text-white shadow-sm hover:bg-[#152b36]"
        >
          Ask Roxy
        </button>
      </div>
    </header>
  );
}
