"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { domainDisplayName } from "@/lib/domain-label";
import type { Domain } from "@/lib/types";
import { ApprovalsPanel } from "@/components/ApprovalsPanel";
import { RestGuards } from "@/components/RestGuards";

export type MoreSubview = "menu" | "approvals" | "rest";

function MoreRow({
  icon,
  title,
  sub,
  onClick,
  href,
}: {
  icon: ReactNode;
  title: string;
  sub: string;
  onClick?: () => void;
  href?: string;
}) {
  const className =
    "flex w-full items-center gap-3 rounded-2xl border border-[rgba(27,54,68,0.08)] bg-white px-4 py-3.5 text-left shadow-sm md:gap-4 md:px-5 md:py-4";
  const body = (
    <>
      <span
        className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-[rgba(45,106,108,0.12)] text-teal md:h-11 md:w-11"
        aria-hidden
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-navy md:text-[16px]">{title}</span>
        <span className="block text-[12px] text-navy/50 md:text-[13px]">{sub}</span>
      </span>
      <span className="text-navy/35" aria-hidden>
        ›
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`${className} no-underline`}>
        {body}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {body}
    </button>
  );
}

export function MobileMore({
  subview,
  onSubview,
  domain,
  onOpenDomains,
  onAskRoxy,
}: {
  subview: MoreSubview;
  onSubview: (v: MoreSubview) => void;
  domain: Domain;
  onOpenDomains: () => void;
  onAskRoxy: () => void;
}) {
  if (subview === "approvals") {
    return (
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-2 md:px-6 md:pb-6 md:pt-4">
        <button
          type="button"
          onClick={() => onSubview("menu")}
          className="mb-2 self-start text-[12px] font-semibold text-teal md:text-[13px]"
        >
          ‹ More
        </button>
        <h1 className="font-serif text-[24px] font-bold text-navy md:text-[28px]">
          Approval Queue
        </h1>
        <p className="mb-3 text-[13px] text-navy/55 md:mb-4 md:text-[14px]">
          Nothing sends without your OK.
        </p>
        <ApprovalsPanel domain={domain} />
      </div>
    );
  }

  if (subview === "rest") {
    return (
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-2 md:px-6 md:pb-6 md:pt-4">
        <button
          type="button"
          onClick={() => onSubview("menu")}
          className="mb-2 self-start text-[12px] font-semibold text-teal md:text-[13px]"
        >
          ‹ More
        </button>
        <h1 className="mb-3 font-serif text-[24px] font-bold text-navy md:mb-4 md:text-[28px]">
          Rest &amp; burnout guards
        </h1>
        <RestGuards />
      </div>
    );
  }

  const domainSub =
    domain === "All"
      ? "TPFI DRSC Myers ALO KB SRF"
      : `Filter · ${domainDisplayName(domain)}`;

  return (
    <div className="px-4 pb-4 pt-2 md:px-6 md:pb-6 md:pt-4">
      <h1 className="mb-4 text-center font-serif text-[28px] font-bold tracking-tight text-navy md:mb-5 md:text-[34px]">
        More
      </h1>
      <div className="space-y-2.5 md:space-y-3">
        <MoreRow
          title="Approval Queue"
          sub="Nothing sends without your OK"
          onClick={() => onSubview("approvals")}
          icon={
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <circle cx="12" cy="12" r="8.25" />
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.5 12.2 2.4 2.3 4.6-5" />
            </svg>
          }
        />
        <MoreRow
          title="Rest & burnout guards"
          sub="Protect your time and energy"
          onClick={() => onSubview("rest")}
          icon={
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3.5 19 7v5.5c0 4.2-2.8 7.4-7 8.5-4.2-1.1-7-4.3-7-8.5V7l7-3.5Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 14.2c-1.4-1.1-2.2-2-2.2-3.1A1.9 1.9 0 0 1 12 9.2a1.9 1.9 0 0 1 2.2 1.9c0 1.1-.8 2-2.2 3.1Z"
              />
            </svg>
          }
        />
        <MoreRow
          title="Domains"
          sub={domainSub}
          onClick={onOpenDomains}
          icon={
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <circle cx="12" cy="12" r="8.25" />
              <path strokeLinecap="round" d="M3.75 12h16.5M12 3.75c2.4 2.6 3.6 5.4 3.6 8.25S14.4 17.65 12 20.25C9.6 17.65 8.4 14.85 8.4 12S9.6 6.35 12 3.75Z" />
            </svg>
          }
        />
        <MoreRow
          title="Settings / Google sign-in"
          sub="Manage preferences and account"
          href="/settings"
          icon={
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <circle cx="12" cy="12" r="3" />
              <path
                strokeLinecap="round"
                d="M12 3.5v2.2M12 18.3v2.2M4.9 6.5l1.6 1.5M17.5 16l1.6 1.5M3.5 12h2.2M18.3 12h2.2M4.9 17.5l1.6-1.5M17.5 8l1.6-1.5"
              />
            </svg>
          }
        />
        <MoreRow
          title="Ask Roxy"
          sub="Get answers and guidance"
          onClick={onAskRoxy}
          icon={
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 16.5V7.8A2.8 2.8 0 0 1 7.8 5h8.4A2.8 2.8 0 0 1 19 7.8v5.4a2.8 2.8 0 0 1-2.8 2.8H9l-4 3.5Z"
              />
              <path strokeLinecap="round" d="M12 9v.01M12 11.5c0 .8.5 1.2 1 1.5" />
            </svg>
          }
        />
      </div>
    </div>
  );
}
