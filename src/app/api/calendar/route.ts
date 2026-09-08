import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isGoogleConfigured } from "@/lib/auth";

/**
 * Calendar API stub — returns empty events when unauthenticated / unconfigured.
 * Wire Google Calendar API when session has accessToken.
 */
export async function GET() {
  if (!isGoogleConfigured()) {
    return NextResponse.json({
      configured: false,
      message: "Connect Google to sync Calendar.",
      events: [],
    });
  }

  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { configured: true, authenticated: false, message: "Sign in required." },
      { status: 401 },
    );
  }

  // Stub: replace with Calendar API list events using session access token
  return NextResponse.json({
    configured: true,
    authenticated: true,
    events: [],
    note: "Calendar stub — attach googleapis client here.",
  });
}
