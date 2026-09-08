export function RestGuards() {
  return (
    <div className="min-h-0 flex-shrink overflow-hidden rounded-[14px] border border-[rgba(27,54,68,0.12)] bg-white px-3 py-2.5 shadow-sm">
      <h3 className="mb-1 font-serif text-[13px] font-semibold text-navy">
        Rest / Burnout guards
      </h3>
      <p className="mb-1.5 text-[10px] text-navy/55">
        Roxy auto-flags · no War Room
      </p>
      <div className="border-b border-[rgba(27,54,68,0.12)] py-2.5 text-[13px]">
        <strong className="mb-0.5 block font-semibold text-alert-text">
          Evening stack = HIGH COLLISION
        </strong>
        <div className="text-xs text-navy/55">
          Roxy automatically flags double-bookings and stacked evenings after 5.
        </div>
      </div>
      <div className="border-b border-[rgba(27,54,68,0.12)] py-2.5 text-[13px]">
        <strong className="mb-0.5 block font-semibold text-navy">
          Next meeting buffer
        </strong>
        <div className="text-xs text-navy/55">
          ALO Chapter · Sat Sep 12 · 11:00 AM ET · protect lead-up.
        </div>
      </div>
      <div className="py-2.5 pb-0 text-[13px]">
        <strong className="mb-0.5 block font-semibold text-navy">
          Recovery markers
        </strong>
        <div className="text-xs text-navy/55">
          Wed Sep 9 marked Lighter after Summit days — burnout guard active.
        </div>
      </div>
    </div>
  );
}
