"use client";

import { useSession, signIn, signOut } from "next-auth/react";

export function ConnectGoogle({ configured }: { configured: boolean }) {
  const { data: session, status } = useSession();
  const signedIn = status === "authenticated" && Boolean(session?.user);

  return (
    <div className="mx-3 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[rgba(27,54,68,0.12)] bg-white px-3 py-3 shadow-sm sm:mx-6 sm:px-4">
      <div className="min-w-0 flex-1">
        <p className="font-serif text-sm font-semibold text-navy">
          {!configured
            ? "Connect Google"
            : signedIn
              ? "Google connected"
              : "Google connected readiness"}
        </p>
        <p className="break-words text-xs text-navy/55">
          {!configured
            ? "Missing Google env — add GOOGLE_CLIENT_ID / SECRET + NEXTAUTH_SECRET to sync domain Gmail & Calendar."
            : signedIn
              ? `Signed in as ${session?.user?.email ?? session?.user?.name ?? "you"} · Domain Gmail & Calendar live.`
              : "OAuth env detected — sign in to load domain Gmail & Calendar."}
        </p>
      </div>
      {signedIn ? (
        <button
          type="button"
          onClick={() => void signOut({ callbackUrl: "/" })}
          className="w-full rounded-full border border-[rgba(27,54,68,0.2)] bg-white px-4 py-2 text-xs font-bold text-navy shadow-sm sm:w-auto"
        >
          Sign out
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            if (!configured) return;
            void signIn("google");
          }}
          disabled={!configured}
          className="w-full rounded-full bg-navy px-4 py-2 text-xs font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {configured ? "Sign in with Google" : "Connect Google (configure env)"}
        </button>
      )}
    </div>
  );
}
