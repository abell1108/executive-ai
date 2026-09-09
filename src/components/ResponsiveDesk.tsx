"use client";

import { Suspense } from "react";
import { useIsLgUp } from "@/hooks/useMediaQuery";
import { CommandCenter } from "@/components/CommandCenter";
import { MobileAppShell } from "@/components/mobile/MobileAppShell";

function MobileDeskShell() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-cream text-navy lg:hidden">
          <p className="text-sm text-navy/60">Loading…</p>
        </div>
      }
    >
      <MobileAppShell />
    </Suspense>
  );
}

/**
 * Below `lg`: Option A mobile shell (`?panel=` → tab).
 * `lg` and up: existing dual-pane CommandCenter (unchanged).
 */
export function ResponsiveDesk() {
  const isLg = useIsLgUp();

  if (isLg === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream text-navy">
        <p className="text-sm text-navy/60">Loading desk…</p>
      </div>
    );
  }

  if (isLg) {
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

  return <MobileDeskShell />;
}
