export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { CommandCenter } from "@/components/CommandCenter";

export default function DeskPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-cream text-navy">
          <p className="text-sm text-navy/60">Loading desk…</p>
        </div>
      }
    >
      <CommandCenter />
    </Suspense>
  );
}
