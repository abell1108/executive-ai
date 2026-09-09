import { COLLISION_MESSAGE } from "@/lib/seed-data";

export function CollisionBanner() {
  return (
    <div className="px-3 pt-3 sm:px-6 sm:pt-4">
      <div
        role="alert"
        className="flex min-h-[56px] items-start gap-2.5 rounded-[10px] border-2 border-[rgba(180,83,9,0.45)] border-l-8 border-l-alert-text bg-alert-bg px-3 py-3 text-alert-text shadow-[0_4px_14px_rgba(180,83,9,0.18)] sm:min-h-[64px] sm:items-center sm:gap-3.5 sm:px-5 sm:py-4"
      >
        <div
          className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-[rgba(180,83,9,0.22)] text-lg font-bold sm:h-9 sm:w-9 sm:text-xl"
          aria-hidden
        >
          ⚠
        </div>
        <p className="text-[11px] font-bold uppercase tracking-wide leading-snug sm:text-[13px]">
          <strong className="font-extrabold tracking-wider">HIGH COLLISION</strong>
          {" · "}
          {COLLISION_MESSAGE.replace(/^HIGH COLLISION · /, "")}
        </p>
      </div>
    </div>
  );
}
