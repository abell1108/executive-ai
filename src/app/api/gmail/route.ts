import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isGoogleConfigured } from "@/lib/auth";

/**
 * Gmail API stub — returns seeded triage when unauthenticated / unconfigured.
 * Wire Google Gmail API when session has accessToken.
 */
export async function GET() {
  if (!isGoogleConfigured()) {
    return NextResponse.json({
      configured: false,
      message: "Connect Google to sync Gmail.",
      items: [],
    });
  }

  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { configured: true, authenticated: false, message: "Sign in required." },
      { status: 401 },
    );
  }

  // Stub: replace with Gmail API list messages using session access token
  return NextResponse.json({
    configured: true,
    authenticated: true,
    items: [],
    note: "Gmail stub — attach googleapis client here.",
  });
}
