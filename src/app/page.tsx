export const dynamic = "force-dynamic";

import { CommandCenter } from "@/components/CommandCenter";
import { isGoogleConfigured } from "@/lib/auth";

export default function HomePage() {
  const googleConfigured = isGoogleConfigured();
  return <CommandCenter googleConfigured={googleConfigured} />;
}
