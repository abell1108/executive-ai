"use client";

import Link from "next/link";
import type { Domain } from "@/lib/types";
import { DOMAINS } from "@/lib/seed-data";
import { domainDisplayName } from "@/lib/domain-label";

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
    <header className="flex flex-wrap items-center gap-3 border-b border-[rgba(27,54,68,0.12)] bg-cream px-3 py-3 sm:gap-5 sm:px-6 sm:py-4">
      <div className="min-w-0 flex-shrink-0 sm:min-w-[200px]">
        <Link href="/" className="block no-underline">
          <h1 className="font-serif text-[17px] font-bold tracking-tight text-navy hover:text-teal sm:text-[22px]">
            Alisa's Command Center
          </h1>
        </Link>
        <p className="mt-0.5 text-[10px] text-navy/55 sm:text-xs">
          Operated by Roxy
        </p>
      </div>

      <div className="ml-auto flex flex-shrink-0 items-center gap-2 sm:order-last sm:ml-0">
        <Link
          href="/settings"
          className="whitespace-nowrap rounded-full border border-[rgba(27,54,68,0.12)] bg-white px-3 py-1.5 text-[11px] font-semibold text-navy shadow-sm hover:border-teal hover:text-teal sm:px-4 sm:py-2 sm:text-[12px]"
        >
          Settings
        </Link>
        <button
          type="button"
          onClick={onAskRoxy}
          className="whitespace-nowrap rounded-full bg-navy px-3.5 py-2 text-[12px] font-bold text-white shadow-sm hover:bg-[#152b36] sm:px-5 sm:py-2.5 sm:text-[13px]"
        >
          Ask Roxy
        </button>
      </div>

      <nav
        className="scrollbar-none -mx-1 flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto px-1 pb-0.5 sm:mx-0 sm:w-auto sm:flex-1 sm:justify-center sm:overflow-visible sm:px-0"
        aria-label="Role filters"
      >
        <span className="mr-1 flex-shrink-0 text-[10px] font-bold uppercase tracking-wider text-navy/55">
          Roles
        </span>
        {DOMAINS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onDomainChange(d)}
            aria-pressed={activeDomain === d}
            className={
              activeDomain === d
                ? "flex-shrink-0 rounded-full border border-navy bg-navy px-3.5 py-1.5 text-xs font-semibold text-white"
                : "flex-shrink-0 rounded-full border border-[rgba(27,54,68,0.12)] bg-white px-3.5 py-1.5 text-xs font-semibold text-navy hover:border-teal hover:text-teal"
            }
          >
            {domainDisplayName(d)}
          </button>
        ))}
      </nav>
    </header>
  );
}
