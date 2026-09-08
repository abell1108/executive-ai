import { COLLISION_MESSAGE } from "@/lib/seed-data";

export function CollisionBanner() {
  return (
    <div className="px-6 pt-4">
      <div
        role="alert"
        className="flex min-h-[64px] items-center gap-3.5 rounded-[10px] border-2 border-[rgba(180,83,9,0.45)] border-l-8 border-l-alert-text bg-alert-bg px-5 py-4 text-alert-text shadow-[0_4px_14px_rgba(180,83,9,0.18)]"
      >
        <div
          className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-[rgba(180,83,9,0.22)] text-xl font-bold"
          aria-hidden
        >
          ⚠
        </div>
        <p className="text-[13px] font-bold uppercase tracking-wide leading-snug">
          <strong className="font-extrabold tracking-wider">HIGH COLLISION</strong>
          {" · "}
          {COLLISION_MESSAGE.replace(/^HIGH COLLISION · /, "")}
        </p>
      </div>
    </div>
  );
}
