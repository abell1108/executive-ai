export function RestGuards() {
  return (
    <div className="min-h-0 flex-shrink overflow-hidden rounded-[14px] border border-[rgba(27,54,68,0.12)] bg-white px-3 py-2.5 shadow-sm">
      <h3 className="mb-1 font-serif text-[13px] font-semibold text-navy">
        Rest / Burnout guards
      </h3>
      <p className="mb-1.5 text-[10px] text-navy/55">
        Generic role tips · live flags when calendar stacks evenings
      </p>
      <div className="border-b border-[rgba(27,54,68,0.12)] py-2.5 text-[13px]">
        <strong className="mb-0.5 block font-semibold text-navy">
          Protect after-5 capacity
        </strong>
        <div className="text-xs text-navy/55">
          Role work after corporate hours — avoid stacking evenings when
          multiple role events land the same night.
        </div>
      </div>
      <div className="border-b border-[rgba(27,54,68,0.12)] py-2.5 text-[13px]">
        <strong className="mb-0.5 block font-semibold text-navy">
          Meeting buffers
        </strong>
        <div className="text-xs text-navy/55">
          Leave lead-up and recovery time around high-stakes role events.
        </div>
      </div>
      <div className="py-2.5 pb-0 text-[13px]">
        <strong className="mb-0.5 block font-semibold text-navy">
          Recovery markers
        </strong>
        <div className="text-xs text-navy/55">
          After heavy role days, keep a lighter block for recovery.
        </div>
      </div>
    </div>
  );
}
