import Link from "next/link";
import { HARD_RULES } from "@/lib/types";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-cream text-navy">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[rgba(27,54,68,0.12)] px-6 py-4">
        <div>
          <h1 className="font-serif text-[22px] font-bold tracking-tight text-navy">
            Settings · Hard rules
          </h1>
          <p className="mt-0.5 text-xs text-navy/55">
            Operated by Roxy · B+C · Alisa approval gate
          </p>
        </div>
        <Link
          href="/"
          className="rounded-full border border-[rgba(27,54,68,0.12)] bg-white px-4 py-2 text-xs font-semibold text-navy shadow-sm hover:border-teal hover:text-teal"
        >
          ← Back to Command Center
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
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
          Vercel, the home CTA enables Sign in with Google. Until then, Sep 2026
          seed data powers the dual-pane UI.
        </div>
      </main>
    </div>
  );
}
