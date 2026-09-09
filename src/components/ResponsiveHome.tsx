"use client";

import { Suspense } from "react";
import { useIsLgUp } from "@/hooks/useMediaQuery";
import { HomeDashboard } from "@/components/HomeDashboard";
import { MobileAppShell } from "@/components/mobile/MobileAppShell";

function MobileHomeShell() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-cream text-navy lg:hidden">
          <p className="text-sm text-navy/60">Loading…</p>
        </div>
      }
    >
      <MobileAppShell initialTab="home" />
    </Suspense>
  );
}

/**
 * Below `lg` (<1024px): Option A mobile bottom-tabs shell.
 * `lg` and up: existing Snap Cards HomeDashboard (unchanged).
 */
export function ResponsiveHome() {
  const isLg = useIsLgUp();

  if (isLg === null) {
    return (
      <>
        <div className="hidden min-h-screen bg-cream lg:block" aria-hidden />
        <div className="min-h-[100dvh] bg-cream lg:hidden" aria-hidden />
      </>
    );
  }

  if (isLg) {
    return <HomeDashboard />;
  }

  return <MobileHomeShell />;
}
