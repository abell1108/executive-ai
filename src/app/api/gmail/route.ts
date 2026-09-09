import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isGoogleConfigured } from "@/lib/auth";
import { inferDomain } from "@/lib/domain-label";

type GmailListResponse = {
  messages?: { id: string; threadId: string }[];
};

type GmailMessage = {
  id: string;
  snippet?: string;
  payload?: {
    headers?: { name: string; value: string }[];
  };
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

export async function GET() {
  try {
    if (!isGoogleConfigured()) {
      return NextResponse.json({
        configured: false,
        authenticated: false,
        source: "seed" as const,
        message: "Connect Google to sync Gmail.",
        items: [],
      });
    }

    const session = await getServerSession(authOptions);
    const accessToken = (session as { accessToken?: string } | null)?.accessToken;

    if (!session || !accessToken) {
      return NextResponse.json({
        configured: true,
        authenticated: false,
        source: "seed" as const,
        message: "Sign in required.",
        items: [],
      });
    }

    const listRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=12&q=" +
        encodeURIComponent("in:inbox newer_than:14d"),
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      },
    );

    if (listRes.status === 401 || listRes.status === 403) {
      return NextResponse.json({
        configured: true,
        authenticated: false,
        source: "seed" as const,
        message: "Gmail token expired or insufficient scope — re-sign in.",
        items: [],
      });
    }

    if (!listRes.ok) {
      return NextResponse.json({
        configured: true,
        authenticated: true,
        source: "seed" as const,
        message: `Gmail list failed (${listRes.status}).`,
        items: [],
      });
    }

    const list = (await listRes.json()) as GmailListResponse;
    const ids = (list.messages ?? []).map((m) => m.id).slice(0, 12);

    const items = await Promise.all(
      ids.map(async (id) => {
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            cache: "no-store",
          },
        );
        if (!msgRes.ok) {
          return null;
        }
        const msg = (await msgRes.json()) as GmailMessage;
        const headers = msg.payload?.headers;
        const subject = header(headers, "Subject") || "(no subject)";
        const from = header(headers, "From");
        const date = header(headers, "Date");
        const domain = inferDomain(`${subject} ${msg.snippet ?? ""}`);
        return {
          id: msg.id,
          domain,
          title: subject,
          meta: formatMeta(from, date),
          from: from || undefined,
          date: date || undefined,
        };
      }),
    );

    return NextResponse.json({
      configured: true,
      authenticated: true,
      source: "live" as const,
      items: items.filter(Boolean),
    });
  } catch {
    return NextResponse.json({
      configured: isGoogleConfigured(),
      authenticated: false,
      source: "seed" as const,
      message: "Gmail request failed.",
      items: [],
    });
  }
}
