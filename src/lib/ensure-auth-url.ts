/** Must run before next-auth reads NEXTAUTH_URL during prerender. */
function resolveAuthUrl(): string {
  const explicit = process.env.NEXTAUTH_URL?.trim();
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return vercel.startsWith("http") ? vercel : `https://${vercel}`;
  return "http://localhost:3000";
}

process.env.NEXTAUTH_URL = resolveAuthUrl();
