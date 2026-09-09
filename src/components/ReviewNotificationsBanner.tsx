"use client";

import { useActiveReviewNotifications } from "@/hooks/useReviewNotifications";
import { domainDisplayName } from "@/lib/domain-label";

type Props = {
  /** Compact card for mobile home; default is desktop banner. */
  variant?: "desktop" | "mobile";
};

export function ReviewNotificationsBanner({ variant = "desktop" }: Props) {
  const { items, dismiss, markDone } = useActiveReviewNotifications();

  if (items.length === 0) return null;

  const sourceUrl = items[0]?.sourceUrl;
  const sourceTitle = items[0]?.sourceTitle;
  const roleLabel = domainDisplayName(items[0]?.role ?? "TPFI");

  if (variant === "mobile") {
    return (
      <section
        className="mb-3 rounded-2xl border border-teal/35 bg-white p-4 shadow-sm md:mb-4 md:p-5"
        aria-label="Needs your review"
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-teal md:text-[12px]">
              Needs your review
            </p>
            <p className="mt-0.5 text-[12px] text-navy/55 md:text-[13px]">
              {items.length} TPFI action item{items.length === 1 ? "" : "s"} ·{" "}
              Role: {roleLabel}
            </p>
          </div>
          {sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 rounded-full border border-teal/40 bg-[rgba(45,106,108,0.08)] px-2.5 py-1 text-[11px] font-semibold text-teal no-underline md:text-[12px]"
            >
              Open Drive
            </a>
          ) : null}
        </div>
        {sourceTitle ? (
          <p className="mb-2 truncate text-[11px] text-navy/45 md:text-[12px]">
            From: {sourceTitle}
          </p>
        ) : null}
        <ul className="space-y-2 md:space-y-2.5">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-[rgba(27,54,68,0.1)] bg-cream/80 px-3 py-2.5 md:px-3.5 md:py-3"
            >
              <p className="text-[13px] font-semibold leading-snug text-navy md:text-[14px]">
                {item.title}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => markDone(item.id)}
                  className="rounded-full bg-teal px-2.5 py-1 text-[11px] font-bold text-white md:text-[12px]"
                >
                  Mark done
                </button>
                <button
                  type="button"
                  onClick={() => dismiss(item.id)}
                  className="rounded-full border border-[rgba(27,54,68,0.18)] bg-white px-2.5 py-1 text-[11px] font-semibold text-navy/70 md:text-[12px]"
                >
                  Dismiss
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section
      className="rounded-2xl border-2 border-teal/40 bg-[rgba(45,106,108,0.06)] px-4 py-4 shadow-sm sm:px-5 sm:py-5"
      aria-label="Needs your review"
      role="region"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex items-start gap-3">
          <span
            className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-teal text-white"
            aria-hidden
          >
            ✎
          </span>
          <div className="min-w-0">
            <h2 className="font-serif text-[18px] font-bold tracking-tight text-navy sm:text-[20px]">
              Needs your review
            </h2>
            <p className="mt-0.5 text-[12px] text-navy/60 sm:text-[13px]">
              {items.length} action item{items.length === 1 ? "" : "s"} from Drive
              · Role: {roleLabel}
            </p>
            {sourceTitle ? (
              <p className="mt-1 truncate text-[11px] text-navy/45 sm:text-[12px]">
                {sourceTitle}
              </p>
            ) : null}
          </div>
        </div>
        {sourceUrl ? (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-full border border-teal/45 bg-white px-3 py-1.5 text-[12px] font-semibold text-teal no-underline shadow-sm hover:border-teal hover:bg-cream"
          >
            Open Drive doc
          </a>
        ) : null}
      </div>

      <ul className="mt-3 space-y-2 sm:mt-4 sm:space-y-2.5">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-col gap-2 rounded-xl border border-[rgba(27,54,68,0.12)] bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4"
          >
            <p className="min-w-0 text-[13px] font-semibold leading-snug text-navy sm:text-sm">
              {item.title}
            </p>
            <div className="flex flex-shrink-0 flex-wrap gap-2">
              <button
                type="button"
                onClick={() => markDone(item.id)}
                className="rounded-full bg-teal px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#25585a] sm:text-[12px]"
              >
                Mark done
              </button>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="rounded-full border border-[rgba(27,54,68,0.18)] bg-cream px-3 py-1.5 text-[11px] font-semibold text-navy/70 hover:border-navy/40 sm:text-[12px]"
              >
                Dismiss
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
