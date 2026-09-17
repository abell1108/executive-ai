/**
 * Detect “Hey/Hi Roxy” draft requests and build template outbound drafts.
 * No paid LLM — heuristic extraction + professional template.
 */

import {
  approvalIdFromTriage,
  readApprovalQueueMap,
  upsertApprovalItem,
} from "@/lib/approval-queue";
import { inferDomain, type LabeledDomain } from "@/lib/domain-label";
import {
  makeReSubject,
  parseSenderEmail,
  parseSenderName,
} from "@/lib/propose-outbound-draft";
import type { Domain } from "@/lib/types";

export type RoxyDraftRequestInput = {
  from?: string;
  subject?: string;
  body?: string;
};

export type BuiltRoxyDraft = {
  to: string;
  subject: string;
  body: string;
  /** Short excerpt of the original request for Approval Queue UI. */
  requestExcerpt: string;
  instructions: string;
};

/** Greeting Roxy and/or explicit draft ask (case-insensitive). */
const ROXY_GREETING =
  /\b(?:hey|hi|hello)\s+roxy\b/i;
const ROXY_DRAFT_ASK =
  /\broxy\b[\s,:\-—–]*(?:please\s+)?(?:create\s+(?:a\s+)?draft|draft|write|compose|prep(?:are)?)\b/i;
const ROXY_ADDRESSED =
  /\b(?:to|for)\s+roxy\b|\broxy@/i;

/**
 * True when subject/body/snippet looks like a Roxy draft request.
 * Matches: “Hey Roxy”, “Hi Roxy”, “Roxy, draft…”, “Hi Roxy — please draft…”, etc.
 */
export function isRoxyDraftRequest(text: string | undefined | null): boolean {
  const t = (text ?? "").trim();
  if (!t) return false;
  if (ROXY_GREETING.test(t)) return true;
  if (ROXY_DRAFT_ASK.test(t)) return true;
  if (ROXY_ADDRESSED.test(t) && /\bdraft\b/i.test(t)) return true;
  return false;
}

function previewExcerpt(text: string, max = 160): string {
  const one = text.replace(/\s+/g, " ").trim();
  if (!one) return "";
  if (one.length <= max) return one;
  return `${one.slice(0, max - 1)}…`;
}

/**
 * Strip greeting / “create a draft of this” framing; keep the pasted ask.
 */
export function extractInstructionsAfterGreeting(text: string): string {
  let t = (text ?? "").replace(/\r\n/g, "\n").trim();
  if (!t) return "";

  // Drop leading Hey/Hi/Hello Roxy (+ punctuation / em dash)
  t = t.replace(
    /^(?:hey|hi|hello)\s+roxy\b[\s,:\-—–.]*/i,
    "",
  ).trim();

  // “Roxy, draft…” / “Roxy — please create a draft of this:”
  t = t.replace(
    /^roxy\b[\s,:\-—–.]*(?:please\s+)?/i,
    "",
  ).trim();

  t = t.replace(
    /^(?:please\s+)?(?:create\s+(?:a\s+)?draft(?:\s+of\s+(?:this|the\s+following))?|draft(?:\s+of\s+(?:this|the\s+following))?|write|compose|prep(?:are)?(?:\s+a\s+draft)?)\b[\s,:\-—–.]*/i,
    "",
  ).trim();

  // Common paste markers
  t = t.replace(/^(?:here(?:'s| is)\s+(?:the\s+)?(?:text|content|message|email)[:\s]*)/i, "").trim();

  return t || (text ?? "").trim();
}

function firstNameFrom(from?: string): string {
  const name = parseSenderName(from);
  if (!name) return "";
  const first = name.split(/\s+/)[0] ?? "";
  if (!first || first.includes("@")) return "";
  return first;
}

function looksLikePastableBody(instructions: string): boolean {
  const lines = instructions.split(/\n/).map((l) => l.trim()).filter(Boolean);
  if (instructions.length > 280) return true;
  if (lines.length >= 3) return true;
  if (/^(dear|hi|hello|good\s+(morning|afternoon|evening))\b/i.test(instructions)) {
    return true;
  }
  return false;
}

/**
 * Build a clean professional outbound draft from a Roxy request email.
 */
export function buildDraftFromRequest(
  input: RoxyDraftRequestInput,
): BuiltRoxyDraft {
  const combined = [input.subject, input.body].filter(Boolean).join("\n\n");
  const instructions = extractInstructionsAfterGreeting(
    (input.body ?? "").trim() || (input.subject ?? "").trim(),
  );
  const to = parseSenderEmail(input.from);
  const subject = makeReSubject(input.subject);
  const requestExcerpt = previewExcerpt(combined || instructions);
  const greetName = firstNameFrom(input.from);
  const greeting = greetName ? `Hi ${greetName},` : "Hello,";

  let body: string;
  if (instructions && looksLikePastableBody(instructions)) {
    // They pasted content to rewrite / send — polish lightly as the draft body.
    const polished = instructions
      .replace(/^(?:hey|hi|hello)\s+roxy\b[\s,:\-—–.]*/i, "")
      .trim();
    const hasSignoff = /\b(thanks|thank you|regards|sincerely|warmly|best)\b/i.test(
      polished.slice(-120),
    );
    body = [
      polished,
      hasSignoff ? null : "",
      hasSignoff ? null : "Warmly,",
      hasSignoff ? null : "Alisa Bellamy",
    ]
      .filter((line) => line !== null)
      .join("\n")
      .trim();
  } else if (instructions) {
    body = [
      greeting,
      "",
      instructions,
      "",
      "Please let me know if you need anything else.",
      "",
      "Warmly,",
      "Alisa Bellamy",
    ].join("\n");
  } else {
    body = [
      greeting,
      "",
      "Thank you for your note — I’m following up as requested.",
      "",
      "Warmly,",
      "Alisa Bellamy",
    ].join("\n");
  }

  return {
    to,
    subject,
    body,
    requestExcerpt,
    instructions,
  };
}

export type InboxLikeForRoxySync = {
  id?: string;
  /** Role id when known; string accepted from loosely typed API payloads. */
  domain?: Domain | string;
  title?: string;
  subject?: string;
  from?: string;
  date?: string;
  notes?: string;
  meta?: string;
};

const LABELED: LabeledDomain[] = [
  "TPFI",
  "DeeperRSC",
  "Myers",
  "ALO",
  "KB",
  "SRF",
];

function resolveDomain(item: InboxLikeForRoxySync): LabeledDomain {
  if (item.domain && item.domain !== "All") {
    if ((LABELED as string[]).includes(item.domain)) {
      return item.domain as LabeledDomain;
    }
  }
  const inferred = inferDomain(
    `${item.title ?? ""} ${item.subject ?? ""} ${item.notes ?? ""} ${item.from ?? ""}`,
  );
  return inferred ?? "TPFI";
}

/**
 * Upsert Roxy-triggered drafts into Approval Queue.
 * Dedupes by Gmail message id — never overwrites an existing queue item (preserves edits).
 * Returns number of newly queued items.
 */
export function syncRoxyDraftRequestsFromInbox(
  items: InboxLikeForRoxySync[],
): number {
  if (typeof window === "undefined") return 0;
  if (!Array.isArray(items) || items.length === 0) return 0;

  const existing = readApprovalQueueMap();
  let added = 0;

  for (const item of items) {
    const triageId = item.id?.trim();
    if (!triageId) continue;

    const subject = (item.subject ?? item.title ?? "").trim();
    const body = (item.notes ?? "").trim();
    const haystack = `${subject}\n${body}\n${item.meta ?? ""}\n${item.from ?? ""}`;
    if (!isRoxyDraftRequest(haystack)) continue;

    const approvalId = approvalIdFromTriage(triageId);
    if (existing[approvalId]) continue;

    const draft = buildDraftFromRequest({
      from: item.from,
      subject: subject || undefined,
      body: body || undefined,
    });

    const domain = resolveDomain(item);
    const to = draft.to;
    const metaParts = [
      "Roxy draft request",
      to ? `To: ${to}` : null,
      item.from
        ? `From: ${item.from.replace(/<[^>]+>/, "").trim() || item.from}`
        : null,
      draft.requestExcerpt || null,
    ].filter(Boolean);

    upsertApprovalItem({
      id: approvalId,
      title: draft.subject,
      meta: metaParts.join(" · "),
      domain,
      status: "pending",
      body: draft.body,
      to: to || undefined,
      subject: draft.subject,
      from: item.from || undefined,
      triageId,
      requestExcerpt: draft.requestExcerpt || undefined,
    });
    added += 1;
  }

  return added;
}
