"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import type { ApprovalStatus, Domain } from "@/lib/types";
import { domainDisplayName } from "@/lib/domain-label";
import {
  countPendingApprovals,
  getApprovalQueueServerSnapshot,
  getApprovalQueueSnapshot,
  setApprovalStatus,
  subscribeApprovalQueue,
  updateApprovalDraft,
  type StoredApprovalItem,
} from "@/lib/approval-queue";
import {
  buildMailtoUrl,
  formatDraftForDoc,
  formatDraftForSheet,
} from "@/lib/propose-outbound-draft";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

function itemSubject(item: StoredApprovalItem): string {
  return (item.subject ?? item.title ?? "").trim();
}

function itemTo(item: StoredApprovalItem): string {
  return (item.to ?? "").trim();
}

function ApprovalQueueRow({ item }: { item: StoredApprovalItem }) {
  const [editing, setEditing] = useState(false);
  const [to, setTo] = useState(itemTo(item));
  const [subject, setSubject] = useState(itemSubject(item));
  const [body, setBody] = useState(item.body ?? "");
  const [flash, setFlash] = useState<string | null>(null);

  const showFlash = (msg: string) => {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 2500);
  };

  const beginEdit = () => {
    setTo(itemTo(item));
    setSubject(itemSubject(item));
    setBody(item.body ?? "");
    setEditing(true);
  };

  const saveEdit = () => {
    const nextTo = to.trim();
    const nextSubject = subject.trim() || item.title;
    const nextBody = body;
    const metaParts = [
      nextTo ? `To: ${nextTo}` : null,
      nextBody.replace(/\s+/g, " ").trim().slice(0, 80) || null,
    ].filter(Boolean);
    updateApprovalDraft(item.id, {
      to: nextTo,
      subject: nextSubject,
      body: nextBody,
      title: nextSubject,
      meta: metaParts.join(" · "),
    });
    setEditing(false);
    showFlash("Draft saved in queue");
  };

  const setStatus = (status: ApprovalStatus) => {
    setApprovalStatus(item.id, status);
  };

  const openMailto = async () => {
    const mailto = buildMailtoUrl({
      to: itemTo(item),
      subject: itemSubject(item),
      body: item.body ?? "",
    });
    if (item.body?.trim()) {
      const ok = await copyText(item.body);
      if (ok) showFlash("Body copied — opening mail draft");
      else showFlash("Opening mail draft");
    } else {
      showFlash("Opening mail draft");
    }
    window.location.href = mailto;
  };

  const copyDoc = async () => {
    const block = formatDraftForDoc({
      title: item.title,
      to: itemTo(item),
      subject: itemSubject(item),
      body: item.body,
      role: domainDisplayName(item.domain),
    });
    const ok = await copyText(block);
    showFlash(ok ? "Copied for Doc" : "Copy failed");
  };

  const copySheet = async () => {
    const tsv = formatDraftForSheet({
      queuedAt: item.updatedAt,
      role: domainDisplayName(item.domain),
      to: itemTo(item),
      subject: itemSubject(item),
      body: item.body,
    });
    const ok = await copyText(tsv);
    showFlash(ok ? "Copied for Sheet" : "Copy failed");
  };

  return (
    <div className="border-b border-[rgba(153,27,27,0.12)] py-2 last:border-b-0 last:pb-0">
      <div className="flex items-start gap-2">
        <span
          className={
            item.status === "approved"
              ? "mt-0.5 flex-shrink-0 rounded-full border border-[rgba(45,106,108,0.35)] bg-white px-2 py-0.5 text-[10px] font-bold text-teal"
              : item.status === "held"
                ? "mt-0.5 flex-shrink-0 rounded-full border border-[rgba(180,83,9,0.35)] bg-white px-2 py-0.5 text-[10px] font-bold text-alert-text"
                : "mt-0.5 flex-shrink-0 rounded-full border border-[rgba(153,27,27,0.2)] bg-white px-2 py-0.5 text-[10px] font-bold text-risk-text"
          }
        >
          {item.status === "approved"
            ? "Approved"
            : item.status === "held"
              ? "On hold"
              : "Needs your OK"}
        </span>
        <div className="min-w-0 flex-1">
          <strong className="block text-xs font-semibold text-risk-text">
            {itemSubject(item) || item.title}
          </strong>
          <div className="mt-0.5 text-[10px] text-[rgba(153,27,27,0.7)]">
            {domainDisplayName(item.domain)}
            {itemTo(item) ? ` · To: ${itemTo(item)}` : item.meta ? ` · ${item.meta}` : ""}
          </div>

          {editing ? (
            <div className="mt-2 space-y-2 rounded-md border border-[rgba(153,27,27,0.15)] bg-white/80 p-2">
              <label className="block">
                <span className="text-[10px] font-semibold text-risk-text/80">
                  To
                </span>
                <input
                  type="email"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="mt-0.5 w-full rounded-lg border border-[rgba(153,27,27,0.2)] bg-white px-2 py-1.5 text-[11px] text-risk-text focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal/40"
                  aria-label="Edit To"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-semibold text-risk-text/80">
                  Subject
                </span>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="mt-0.5 w-full rounded-lg border border-[rgba(153,27,27,0.2)] bg-white px-2 py-1.5 text-[11px] text-risk-text focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal/40"
                  aria-label="Edit subject"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-semibold text-risk-text/80">
                  Body
                </span>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={6}
                  className="mt-0.5 w-full resize-y rounded-lg border border-[rgba(153,27,27,0.2)] bg-white px-2 py-1.5 text-[11px] leading-snug text-risk-text focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal/40"
                  aria-label="Edit body"
                />
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={saveEdit}
                  className="rounded-full bg-navy px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#152b36]"
                >
                  Save draft
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-full border border-[rgba(153,27,27,0.3)] bg-white px-3 py-1.5 text-[11px] font-bold text-risk-text"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : item.body?.trim() ? (
            <p className="mt-1.5 whitespace-pre-wrap rounded-md border border-[rgba(153,27,27,0.1)] bg-white/60 px-2 py-1.5 text-[11px] leading-snug text-risk-text/90">
              {item.body.trim()}
            </p>
          ) : null}

          {!editing && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={beginEdit}
                className="rounded-full border border-[rgba(153,27,27,0.3)] bg-white px-3 py-1.5 text-[11px] font-bold text-risk-text hover:border-teal hover:text-teal"
              >
                Edit draft
              </button>
              <button
                type="button"
                onClick={() => void openMailto()}
                className="rounded-full border border-teal/35 bg-white px-3 py-1.5 text-[11px] font-bold text-teal hover:border-teal"
              >
                Email draft
              </button>
              <button
                type="button"
                onClick={() => void copyDoc()}
                className="rounded-full border border-[rgba(27,54,68,0.2)] bg-cream px-3 py-1.5 text-[11px] font-bold text-navy hover:border-teal hover:text-teal"
              >
                Copy for Doc
              </button>
              <button
                type="button"
                onClick={() => void copySheet()}
                className="rounded-full border border-[rgba(27,54,68,0.2)] bg-cream px-3 py-1.5 text-[11px] font-bold text-navy hover:border-teal hover:text-teal"
              >
                Copy for Sheet
              </button>
            </div>
          )}

          {item.status === "pending" && !editing && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setStatus("approved")}
                className="rounded-full bg-navy px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#152b36]"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => setStatus("held")}
                className="rounded-full border border-[rgba(153,27,27,0.3)] bg-white px-3 py-1.5 text-[11px] font-bold text-risk-text hover:border-alert-text hover:text-alert-text"
              >
                Hold
              </button>
            </div>
          )}
          {item.status !== "pending" && !editing && (
            <button
              type="button"
              onClick={() => setStatus("pending")}
              className="mt-2 text-[10px] font-semibold text-[rgba(153,27,27,0.75)] underline-offset-2 hover:underline"
            >
              Undo
            </button>
          )}
          {flash ? (
            <p className="mt-1.5 text-[10px] font-semibold text-teal" role="status">
              {flash}
            </p>
          ) : null}
          <p className="mt-1 text-[9px] leading-snug text-[rgba(153,27,27,0.55)]">
            Approve = status only (does not send). Use Email draft for a mailto: compose window.
          </p>
        </div>
      </div>
    </div>
  );
}

export function ApprovalsPanel({ domain }: { domain: Domain }) {
  const items = useSyncExternalStore(
    subscribeApprovalQueue,
    getApprovalQueueSnapshot,
    getApprovalQueueServerSnapshot,
  );

  const visible = useMemo(
    () =>
      domain === "All" ? items : items.filter((item) => item.domain === domain),
    [domain, items],
  );

  const pendingCount = countPendingApprovals(visible);

  return (
    <div className="min-h-0 flex-shrink overflow-hidden rounded-[14px] border border-transparent border-l-[5px] border-l-risk-text bg-risk-bg px-3 py-2.5 shadow-sm">
      <h3 className="mb-1 font-serif text-[13px] font-semibold text-risk-text">
        Approval Queue{" "}
        <span className="ml-2 inline-block align-middle rounded-full border border-[rgba(153,27,27,0.25)] bg-white px-2 py-0.5 text-[10px] font-bold text-risk-text">
          {pendingCount > 0
            ? `Needs your OK · ${pendingCount}`
            : "Needs your OK"}
        </span>
      </h3>
      <p className="mb-2 text-[11px] leading-snug text-[rgba(153,27,27,0.85)]">
        Outbound drafts land here first. Approve = you green-light (still does
        not auto-send in MVP). Hold = pause. Nothing goes out without your OK.
      </p>
      {visible.length === 0 && (
        <div className="rounded-lg border border-[rgba(153,27,27,0.15)] bg-white/70 px-3 py-3">
          <p className="text-xs font-semibold text-risk-text">
            Queue clear — nothing waiting
          </p>
          <p className="mt-1 text-[11px] leading-snug text-[rgba(153,27,27,0.75)]">
            When Roxy prepares outbound email replies, invites, or posts,
            they&apos;ll show up here for your OK before anything is sent. From
            Inbox triage, use Edit → Propose draft, then &ldquo;Send to Approval
            Queue.&rdquo;
          </p>
        </div>
      )}
      {visible.map((item) => (
        <ApprovalQueueRow key={item.id} item={item} />
      ))}
    </div>
  );
}
