"use client";

import { useEffect, useId, useState, type FormEvent } from "react";

export function AskRoxy({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const titleId = useId();
  const [prompt, setPrompt] = useState("");
  const [echo, setEcho] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = prompt.trim();
    if (!text) return;
    setEcho(
      `Roxy noted: “${text}”. Platform brain will draft replies and calendar moves here — outbound still waits for your approval gate.`,
    );
    setPrompt("");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[rgba(27,54,68,0.45)]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-md flex-col border-l border-[rgba(27,54,68,0.12)] bg-cream shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[rgba(27,54,68,0.12)] px-5 py-4">
          <div>
            <h2
              id={titleId}
              className="font-serif text-lg font-bold tracking-tight text-navy"
            >
              Ask Roxy
            </h2>
            <p className="text-xs text-navy/55">
              Your EA platform brain · guidance & drafts · approval-gated outbound
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[rgba(27,54,68,0.12)] bg-white px-3 py-1.5 text-xs font-semibold text-navy hover:border-teal hover:text-teal"
            aria-label="Close Ask Roxy"
          >
            Close
          </button>
        </div>

        <form onSubmit={submit} className="flex flex-1 flex-col gap-3 p-5">
          <label htmlFor="ask-roxy" className="sr-only">
            Ask Roxy
          </label>
          <textarea
            id="ask-roxy"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask Roxy…"
            rows={6}
            className="w-full resize-none rounded-xl border border-[rgba(27,54,68,0.14)] bg-white px-3.5 py-3 text-sm text-navy shadow-sm outline-none focus:border-teal focus:ring-2 focus:ring-[rgba(45,106,108,0.2)]"
          />
          <button
            type="submit"
            className="rounded-full bg-navy px-5 py-2.5 text-[13px] font-bold text-white shadow-sm hover:bg-[#152b36]"
          >
            Send to Roxy
          </button>
          {echo && (
            <div className="rounded-xl border border-[rgba(45,106,108,0.25)] bg-[rgba(45,106,108,0.08)] px-3.5 py-3 text-sm text-navy">
              {echo}
            </div>
          )}
          <p className="mt-auto text-[11px] text-navy/55">
            Outbound actions still require Alisa&apos;s approval gate. Sunday
            recap has standing approval.
          </p>
        </form>
      </div>
    </div>
  );
}
