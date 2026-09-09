"use client";

import type { ReactNode } from "react";

export type MobileTab = "home" | "agenda" | "inbox" | "approvals" | "more";

const TABS: {
  id: MobileTab;
  label: string;
  icon: (active: boolean) => ReactNode;
}[] = [
  {
    id: "home",
    label: "Home",
    icon: (active) => (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? 2.25 : 1.75}
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z"
        />
      </svg>
    ),
  },
  {
    id: "agenda",
    label: "Agenda",
    icon: (active) => (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? 2.25 : 1.75}
        aria-hidden
      >
        <rect x="3.5" y="5" width="17" height="15" rx="2" />
        <path strokeLinecap="round" d="M8 3.5v3M16 3.5v3M3.5 9.5h17" />
      </svg>
    ),
  },
  {
    id: "inbox",
    label: "Inbox",
    icon: (active) => (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? 2.25 : 1.75}
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 6.5h16v11a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-11Z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" d="m4 7 8 6 8-6" />
      </svg>
    ),
  },
  {
    id: "approvals",
    label: "Approvals",
    icon: (active) => (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? 2.25 : 1.75}
        aria-hidden
      >
        <circle cx="12" cy="12" r="8.25" />
        <path strokeLinecap="round" strokeLinejoin="round" d="m8.5 12.2 2.4 2.3 4.6-5" />
      </svg>
    ),
  },
  {
    id: "more",
    label: "More",
    icon: (active) => (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? 2.25 : 1.75}
        aria-hidden
      >
        <circle cx="6.5" cy="12" r="1.25" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none" />
        <circle cx="17.5" cy="12" r="1.25" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

export function MobileTabBar({
  active,
  onChange,
  inboxBadge,
}: {
  active: MobileTab;
  onChange: (tab: MobileTab) => void;
  inboxBadge?: number | null;
}) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[rgba(27,54,68,0.12)] bg-cream/95 backdrop-blur-md pb-[env(safe-area-inset-bottom,0px)]"
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-between px-1 pt-1.5 pb-1">
        {TABS.map((tab) => {
          const isActive = active === tab.id;
          const showBadge =
            tab.id === "inbox" &&
            inboxBadge != null &&
            inboxBadge > 0;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              aria-current={isActive ? "page" : undefined}
              className={
                isActive
                  ? "relative flex min-h-[48px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-teal"
                  : "relative flex min-h-[48px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-navy/45"
              }
            >
              <span className="relative">
                {tab.icon(isActive)}
                {showBadge ? (
                  <span className="absolute -right-2.5 -top-1.5 grid min-h-[16px] min-w-[16px] place-items-center rounded-full bg-teal px-1 text-[9px] font-bold leading-none text-white">
                    {inboxBadge! > 99 ? "99+" : inboxBadge}
                  </span>
                ) : null}
              </span>
              <span
                className={
                  isActive
                    ? "text-[10px] font-semibold tracking-tight"
                    : "text-[10px] font-medium tracking-tight"
                }
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
