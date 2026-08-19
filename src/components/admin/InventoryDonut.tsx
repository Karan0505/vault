export function InventoryDonut() {
  const inStock = 842;
  const lowStock = 240;
  const outOfStock = 164;
  const total = inStock + lowStock + outOfStock;

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-[#1E293B] bg-[#111827] p-6 shadow-panel">
      <div className="flex items-center justify-between">
        <h3 className="font-sans text-sm font-bold text-white">Inventory Summary</h3>
        <span className="rounded-md bg-[#1E293B] px-2 py-0.5 font-mono text-[10px] text-slate-400">Realtime</span>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-around gap-6 pt-2">
        {/* SVG Donut Chart */}
        <div className="relative flex h-36 w-36 items-center justify-center">
          <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
            {/* Background Ring */}
            <circle
              cx="18"
              cy="18"
              r="14"
              fill="none"
              stroke="#1E293B"
              strokeWidth="4"
            />
            {/* In Stock Segment (68%) */}
            <circle
              cx="18"
              cy="18"
              r="14"
              fill="none"
              stroke="#10B981"
              strokeWidth="4"
              strokeDasharray="60 100"
              strokeDashoffset="0"
              strokeLinecap="round"
            />
            {/* Low Stock Segment (19%) */}
            <circle
              cx="18"
              cy="18"
              r="14"
              fill="none"
              stroke="#F59E0B"
              strokeWidth="4"
              strokeDasharray="17 100"
              strokeDashoffset="-60"
              strokeLinecap="round"
            />
            {/* Out of Stock Segment (13%) */}
            <circle
              cx="18"
              cy="18"
              r="14"
              fill="none"
              stroke="#EF4444"
              strokeWidth="4"
              strokeDasharray="11 100"
              strokeDashoffset="-77"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="font-mono text-base font-extrabold text-white">1,246</span>
            <span className="text-[10px] text-slate-500 font-sans">Total Units</span>
          </div>
        </div>

        {/* Legend stats */}
        <div className="flex flex-col gap-2.5 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-300">In Stock:</span>
            <span className="font-mono font-bold text-white">842 (68%)</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            <span className="text-slate-300">Low Stock:</span>
            <span className="font-mono font-bold text-white">240 (19%)</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
            <span className="text-slate-300">Out of Stock:</span>
            <span className="font-mono font-bold text-white">164 (13%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
