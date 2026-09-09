import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

function resolveAuthUrl(): string {
  const explicit = process.env.NEXTAUTH_URL?.trim();
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return vercel.startsWith("http") ? vercel : `https://${vercel}`;
  return "http://localhost:3000";
}

// NextAuth calls `new URL(NEXTAUTH_URL)` during prerender; blank env on Vercel throws Invalid URL.
process.env.NEXTAUTH_URL = resolveAuthUrl();

const googleId = process.env.GOOGLE_CLIENT_ID?.trim();
const googleSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
const authSecret =
  process.env.NEXTAUTH_SECRET?.trim() ||
  "build-fallback-secret-do-not-use-in-production";

/** True when Google OAuth client id + secret are both set (no placeholders). */
export function isGoogleConfigured(): boolean {
  return Boolean(googleId && googleSecret);
}

const providers: NextAuthOptions["providers"] = [];

if (googleId && googleSecret) {
  providers.push(
    GoogleProvider({
      clientId: googleId,
      clientSecret: googleSecret,
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/calendar.readonly",
          ].join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  );
}

async function refreshAccessToken(token: {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  error?: string;
  [key: string]: unknown;
}) {
  if (!token.refreshToken || !googleId || !googleSecret) {
    return { ...token, error: "RefreshAccessTokenError" };
  }

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: googleId,
        client_secret: googleSecret,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
    });

    const data = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
      refresh_token?: string;
      error?: string;
    };

    if (!res.ok || !data.access_token) {
      return { ...token, error: "RefreshAccessTokenError" };
    }

    return {
      ...token,
      accessToken: data.access_token,
      expiresAt: Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
      // Google only returns a new refresh_token sometimes — keep the old one.
      refreshToken: data.refresh_token ?? token.refreshToken,
      error: undefined,
    };
  } catch {
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

export const authOptions: NextAuthOptions = {
  providers,
  secret: authSecret,
  pages: {
    signIn: "/",
  },
  callbacks: {
    async jwt({ token, account }) {
      // Initial sign-in: persist Google tokens
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token ?? token.refreshToken;
        token.expiresAt = account.expires_at ?? undefined;
        token.error = undefined;
        return token;
      }

      // Still valid (60s skew)
      if (
        token.expiresAt &&
        typeof token.expiresAt === "number" &&
        Date.now() < token.expiresAt * 1000 - 60_000
      ) {
        return token;
      }

      // Expired or missing expiry — try refresh when we have a refresh token
      if (token.refreshToken) {
        return refreshAccessToken(token);
      }

      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined;
      return session;
    },
  },
};
