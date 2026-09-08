"use client";

import { signIn } from "next-auth/react";

export function ConnectGoogle({ configured }: { configured: boolean }) {
  return (
    <div className="mx-6 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[rgba(27,54,68,0.12)] bg-white px-4 py-3 shadow-sm">
      <div>
        <p className="font-serif text-sm font-semibold text-navy">
          {configured ? "Google connected readiness" : "Connect Google"}
        </p>
        <p className="text-xs text-navy/55">
          {configured
            ? "OAuth env detected — sign in to sync Gmail & Calendar."
            : "Missing Google env — seeded demo UI still available. Add GOOGLE_CLIENT_ID / SECRET + NEXTAUTH_SECRET to .env.local."}
        </p>
      </div>
      <button
        type="button"
        onClick={() => signIn("google")}
        disabled={!configured}
        className="rounded-full bg-navy px-4 py-2 text-xs font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
      >
        {configured ? "Sign in with Google" : "Connect Google (configure env)"}
      </button>
    </div>
  );
}
