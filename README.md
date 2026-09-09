# Alisa EA Command Center

Next.js 15 + TypeScript + Tailwind. Operated by Roxy. Dual-pane B+C.
Mobile-friendly Progressive Web App (installable standalone).

Repo: https://github.com/abell1108/executive-ai.git
Prod: https://roxy.alisabellamy.com
Legacy Vercel URL (optional): https://executive-ai-one.vercel.app

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

Import the repo on Vercel. Configure:

- `NEXTAUTH_URL=https://roxy.alisabellamy.com` (**required for production** — must match the custom domain)
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`

Build does not require them; live Google sign-in does.
`signIn("google")` uses an explicit `callbackUrl: "/"` rooted via `NEXTAUTH_URL`.

## 4. Google Cloud Console

### Authorized JavaScript origins
- http://localhost:3000
- https://roxy.alisabellamy.com
- https://executive-ai-one.vercel.app (legacy / optional)

### Authorized redirect URIs
- http://localhost:3000/api/auth/callback/google
- https://roxy.alisabellamy.com/api/auth/callback/google
- https://executive-ai-one.vercel.app/api/auth/callback/google (legacy / optional)
- https://executive-ai-git-main-abell1108.vercel.app/api/auth/callback/google (preview / optional)

Enable Gmail API and Calendar API.

## PWA

- Manifest: /manifest.webmanifest (name Alisa EA Command Center, short EA Desk)
- Service worker: /sw.js (offline shell + network-first navigation)
- Icons: /icons/icon-192.png, /icons/icon-512.png
- Theme #1B3644, background #F9F7F2

## Approval workflow (MVP)

- Outbound drafts land in Approvals Needs Alisa.
- Approve marks approved in client state only; it does not send email.
- Hold parks the item; Undo returns it to pending.
- Sunday recap has standing approval (Settings hard rules).
- Ask Roxy is a slide-over with local echo for MVP.

## Architecture

- Roxy-only Ask Roxy CTA
- Left ~68 percent Agenda with Agenda or Calendar toggle (month bento pills and dots)
- Right ~32 percent Inbox, Approvals Needs Alisa, Rest guards (stacks below agenda on mobile)
- Domain chips filter agenda, inbox, approvals (horizontal scroll on small screens)
- /settings lists hard rules (9-5, buffers, ALO 2nd Sat, approval gate, Sunday recap)
- NextAuth Google provider only when credentials are set (no placeholder ids)
- Gmail and Calendar API stubs
- SessionProvider restored with refetchOnWindowFocus={false}

## Seed Sep 2026

Corporate 9-5, Global Africa Summit, ALO Sep 12, TPFI icebreaker, approvals Rev EJ / Trinity / BWSS

## Tokens

bg F9F7F2, navy 1B3644, teal 2D6A6C, alert FEF3E2/B45309, risk FDECEA/991B1B
Fonts Playfair Display and Inter
