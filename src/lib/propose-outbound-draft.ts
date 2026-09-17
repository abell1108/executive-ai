/**
 * Template-based outbound draft for Inbox triage → Approval Queue.
 * No LLM — warm professional tone for Alisa Bellamy / Roxy EA.
 */

export type ProposeOutboundDraftInput = {
  from?: string;
  subject?: string;
  notes?: string;
  existingDecision?: string;
};

export type ProposedOutboundDraft = {
  to: string;
  subject: string;
  body: string;
};

/** Extract a bare email from "Name <email@x.com>" or a bare address. */
export function parseSenderEmail(from?: string): string {
  if (!from) return "";
  const angled = from.match(/<([^>\s]+@[^>\s]+)>/);
  if (angled?.[1]) return angled[1].trim();
  const bare = from.trim();
  if (/^[^\s<>]+@[^\s<>]+\.[^\s<>]+$/.test(bare)) return bare;
  const embedded = bare.match(/[^\s<>]+@[^\s<>]+\.[^\s<>]+/);
  return embedded?.[0] ?? "";
}

/** Display name without angle-bracket email. */
export function parseSenderName(from?: string): string {
  if (!from) return "";
  const withoutEmail = from.replace(/<[^>]+>/, "").trim();
  return withoutEmail.replace(/^["']|["']$/g, "").trim() || withoutEmail;
}

export function makeReSubject(subject?: string): string {
  const s = (subject ?? "").trim() || "Your message";
  if (/^re:\s/i.test(s)) return s;
  return `Re: ${s}`;
}

function firstNameFrom(from?: string): string {
  const name = parseSenderName(from);
  if (!name) return "";
  const first = name.split(/\s+/)[0] ?? "";
  if (!first || first.includes("@")) return "";
  return first;
}

function summarizeNotes(notes?: string, max = 220): string {
  const one = (notes ?? "").replace(/\s+/g, " ").trim();
  if (!one) return "";
  if (one.length <= max) return one;
  return `${one.slice(0, max - 1)}…`;
}

/**
 * Build a proposed outbound reply draft from inbox triage fields.
 * Prefers an existing decision/response when present.
 */
export function proposeOutboundDraft(
  input: ProposeOutboundDraftInput,
): ProposedOutboundDraft {
  const to = parseSenderEmail(input.from);
  const subject = makeReSubject(input.subject);
  const existing = input.existingDecision?.trim();
  if (existing) {
    return { to, subject, body: existing };
  }

  const greetName = firstNameFrom(input.from);
  const greeting = greetName ? `Hi ${greetName},` : "Hello,";
  const noteBit = summarizeNotes(input.notes);
  const contextLine = noteBit
    ? `Thank you for your note regarding “${(input.subject ?? "").trim() || "this"}.” I’ve reviewed the details you shared.`
    : `Thank you for reaching out${(input.subject ?? "").trim() ? ` about “${(input.subject ?? "").trim()}.”` : "."}`;

  const body = [
    greeting,
    "",
    contextLine,
    noteBit
      ? ""
      : null,
    noteBit
      ? `Here’s what I’m working from on Alisa’s behalf: ${noteBit}`
      : null,
    "",
    "I’ll follow up shortly with next steps or the information you need. Please let me know if anything is time-sensitive.",
    "",
    "Warmly,",
    "Roxy",
    "Executive Assistant to Alisa Bellamy",
  ]
    .filter((line) => line !== null)
    .join("\n");

  return { to, subject, body };
}

/** Build a properly encoded mailto: URL (never auto-sends). */
export function buildMailtoUrl(opts: {
  to?: string;
  subject?: string;
  body?: string;
}): string {
  const to = (opts.to ?? "").trim();
  const parts: string[] = [];
  if (opts.subject?.trim()) {
    parts.push(`subject=${encodeURIComponent(opts.subject.trim())}`);
  }
  if (opts.body?.trim()) {
    parts.push(`body=${encodeURIComponent(opts.body.trim())}`);
  }
  return `mailto:${to}${parts.length ? `?${parts.join("&")}` : ""}`;
}

/** Readable block for Docs paste. */
export function formatDraftForDoc(opts: {
  title?: string;
  to?: string;
  subject?: string;
  body?: string;
  role?: string;
}): string {
  const lines = [
    `Title: ${(opts.title ?? opts.subject ?? "").trim() || "(untitled)"}`,
    opts.role ? `Role: ${opts.role}` : null,
    `To: ${(opts.to ?? "").trim() || "(none)"}`,
    `Subject: ${(opts.subject ?? "").trim() || "(none)"}`,
    "",
    "Body:",
    (opts.body ?? "").trim() || "(empty)",
  ];
  return lines.filter((l) => l !== null).join("\n");
}

/** TSV header + one row for Sheets paste. */
export function formatDraftForSheet(opts: {
  queuedAt?: string;
  role?: string;
  to?: string;
  subject?: string;
  body?: string;
}): string {
  const escape = (v: string) => {
    const one = v.replace(/\r?\n/g, " ").replace(/\t/g, " ").trim();
    return one;
  };
  const header = ["queuedAt", "role", "to", "subject", "body"].join("\t");
  const row = [
    escape(opts.queuedAt ?? ""),
    escape(opts.role ?? ""),
    escape(opts.to ?? ""),
    escape(opts.subject ?? ""),
    escape(opts.body ?? ""),
  ].join("\t");
  return `${header}\n${row}`;
}
