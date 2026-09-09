import Link from "next/link";
import { HARD_RULES } from "@/lib/types";
import { isGoogleConfigured } from "@/lib/auth";
import { ConnectGoogle } from "@/components/ConnectGoogle";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const googleConfigured = isGoogleConfigured();

  return (
    <div className="min-h-screen bg-cream text-navy">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[rgba(27,54,68,0.12)] px-6 py-4">
        <div>
          <Link href="/" className="block no-underline">
            <h1 className="font-serif text-[22px] font-bold tracking-tight text-navy hover:text-teal">
              Alisa EA Command Center
            </h1>
          </Link>
          <p className="mt-0.5 text-xs text-navy/55">
            Settings · Hard rules · Operated by Roxy
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/desk"
            className="rounded-full border border-[rgba(27,54,68,0.12)] bg-white px-4 py-2 text-xs font-semibold text-navy shadow-sm hover:border-teal hover:text-teal"
          >
            Open desk
          </Link>
          <Link
            href="/"
            className="rounded-full border border-[rgba(27,54,68,0.12)] bg-white px-4 py-2 text-xs font-semibold text-navy shadow-sm hover:border-teal hover:text-teal"
          >
            ← Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <section className="mb-8" aria-label="Google connection">
          <h2 className="mb-3 font-serif text-base font-semibold text-navy">
            Google connection
          </h2>
          <ConnectGoogle configured={googleConfigured} />
        </section>

        <p className="mb-6 text-sm text-navy/70">
          These rules are product constraints for Roxy. Changing them requires
          Alisa&apos;s explicit approval — they are not self-serve toggles in
          this MVP.
        </p>
        <ul className="space-y-3">
          {HARD_RULES.map((rule) => (
            <li
              key={rule.title}
              className="rounded-xl border border-[rgba(27,54,68,0.12)] bg-white px-4 py-3.5 shadow-sm"
            >
              <h2 className="font-serif text-base font-semibold text-navy">
                {rule.title}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-navy/65">
                {rule.detail}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-8 rounded-xl border border-[rgba(45,106,108,0.25)] bg-[rgba(45,106,108,0.06)] px-4 py-3.5 text-sm text-navy">
          <strong className="font-semibold">Connect Google:</strong> when{" "}
          <code className="text-xs">GOOGLE_CLIENT_ID</code> /{" "}
          <code className="text-xs">GOOGLE_CLIENT_SECRET</code> are set in
          Vercel, Sign in with Google is available above. Once signed in,
          Inbox and Calendar show live domain-labeled items only (TPFI, DRSC,
          Myers, ALO, KB, SRF).
        </div>
      </main>
    </div>
  );
}
