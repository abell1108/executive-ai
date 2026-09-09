import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isGoogleConfigured } from "@/lib/auth";
import { inferDomain } from "@/lib/domain-label";
import type { Domain } from "@/lib/types";

const NOTES_MAX = 3500;

type GmailPart = {
  mimeType?: string;
  filename?: string;
  body?: { data?: string; size?: number };
  parts?: GmailPart[];
  headers?: { name: string; value: string }[];
};

type GmailMessage = {
  id: string;
  snippet?: string;
  payload?: GmailPart;
  internalDate?: string;
};

function header(
  headers: { name: string; value: string }[] | undefined,
  name: string,
): string {
  return (
    headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ??
    ""
  );
}

function formatMeta(from: string, date: string): string {
  const fromShort = from.replace(/<[^>]+>/, "").trim() || from;
  if (fromShort && date) return `${fromShort} · ${date}`;
  return fromShort || date || "Inbox";
}

function decodeBase64Url(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf8");
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function collectTextParts(
  part: GmailPart | undefined,
  out: { mime: string; text: string }[],
): void {
  if (!part) return;
  if (part.body?.data && part.mimeType) {
    if (part.mimeType === "text/plain" || part.mimeType === "text/html") {
      out.push({
        mime: part.mimeType,
        text: decodeBase64Url(part.body.data),
      });
    }
  }
  for (const child of part.parts ?? []) {
    collectTextParts(child, out);
  }
}

function extractNotes(msg: GmailMessage): string {
  const collected: { mime: string; text: string }[] = [];
  collectTextParts(msg.payload, collected);

  const plain = collected.find((c) => c.mime === "text/plain");
  const html = collected.find((c) => c.mime === "text/html");
  let notes =
    plain?.text?.trim() ||
    (html ? stripHtml(html.text) : "") ||
    (msg.snippet ?? "").trim();

  if (notes.length > NOTES_MAX) {
    notes = notes.slice(0, NOTES_MAX).trimEnd() + "…";
  }
  return notes;
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: rawId } = await context.params;
    const id = decodeURIComponent(rawId || "").trim();
    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      return NextResponse.json(
        { error: "Invalid message id." },
        { status: 400 },
      );
    }

    if (!isGoogleConfigured()) {
      return NextResponse.json(
        {
          configured: false,
          authenticated: false,
          error: "Connect Google to sync Gmail.",
        },
        { status: 503 },
      );
    }

    const session = await getServerSession(authOptions);
    const accessToken = (session as { accessToken?: string } | null)
      ?.accessToken;

    if (!session || !accessToken) {
      return NextResponse.json(
        {
          configured: true,
          authenticated: false,
          error: "Sign in required.",
        },
        { status: 401 },
      );
    }

    const msgRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}?format=full`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      },
    );

    if (msgRes.status === 401 || msgRes.status === 403) {
      return NextResponse.json(
        {
          configured: true,
          authenticated: false,
          error: "Gmail token expired or insufficient scope — re-sign in.",
        },
        { status: 401 },
      );
    }

    if (msgRes.status === 404) {
      return NextResponse.json(
        { error: "Message not found." },
        { status: 404 },
      );
    }

    if (!msgRes.ok) {
      return NextResponse.json(
        { error: `Gmail fetch failed (${msgRes.status}).` },
        { status: 502 },
      );
    }

    const msg = (await msgRes.json()) as GmailMessage;
    const headers = msg.payload?.headers;
    const subject = header(headers, "Subject") || "(no subject)";
    const from = header(headers, "From");
    const date = header(headers, "Date");
    const notes = extractNotes(msg);
    const domain =
      inferDomain(`${subject} ${notes} ${from} ${msg.snippet ?? ""}`) ??
      ("All" as Domain);

    return NextResponse.json({
      configured: true,
      authenticated: true,
      item: {
        id: msg.id,
        domain,
        title: subject,
        meta: formatMeta(from, date),
        from: from || undefined,
        date: date || undefined,
        notes: notes || undefined,
      },
    });
  } catch {
    return NextResponse.json(
      {
        configured: isGoogleConfigured(),
        authenticated: false,
        error: "Gmail detail request failed.",
      },
      { status: 500 },
    );
  }
}
