# Alisa EA Command Center

Next.js 15 + TypeScript + Tailwind. Operated by Roxy. Dual-pane B+C.

Repo: https://github.com/abell1108/executive-ai.git

## 1. Local

npm i
npm run dev
npm run build

Build succeeds with no environment variables set (Vercel-safe).
Seeded Sep 2026 UI always renders.
Connect Google CTA when OAuth is not configured.

## 2. GitHub

Push to abell1108/executive-ai on main when Alisa approves.

## 3. Vercel env vars

Import the repo on Vercel. Configure the keys listed in the env example file:
NEXTAUTH_URL, NEXTAUTH_SECRET, and the Google OAuth client id/secret pair.
Build does not require them; live Google sign-in does.

## 4. Google Cloud Console redirect URIs

- http://localhost:3000/api/auth/callback/google
- https://executive-ai-git-main-abell1108.vercel.app/api/auth/callback/google
- https://YOUR-PRODUCTION-DOMAIN/api/auth/callback/google

Enable Gmail API and Calendar API.

## Approval workflow (MVP)

- Outbound drafts land in Approvals Needs Alisa.
- Approve marks approved in client state only; it does not send email.
- Hold parks the item; Undo returns it to pending.
- Sunday recap has standing approval (Settings hard rules).
- Ask Roxy is a slide-over with local echo for MVP.

## Architecture

- Roxy-only Ask Roxy CTA
- Left ~68 percent Agenda with Agenda or Calendar toggle (month bento pills and dots)
- Right ~32 percent Inbox, Approvals Needs Alisa, Rest guards
- Domain chips filter agenda, inbox, approvals
- /settings lists hard rules (9-5, buffers, ALO 2nd Sat, approval gate, Sunday recap)
- NextAuth Google provider only when credentials are set (no placeholder ids)
- Gmail and Calendar API stubs

## Seed Sep 2026

Corporate 9-5, Global Africa Summit, ALO Sep 12, TPFI icebreaker, approvals Rev EJ / Trinity / BWSS

## Tokens

bg F9F7F2, navy 1B3644, teal 2D6A6C, alert FEF3E2/B45309, risk FDECEA/991B1B
Fonts Playfair Display and Inter
