interface InventorySummaryProps {
  inStock?: number;
  lowStock?: number;
  outOfStock?: number;
}

export function InventoryDonut({
  inStock = 842,
  lowStock = 240,
  outOfStock = 164,
}: InventorySummaryProps) {
  const total = Math.max(1, inStock + lowStock + outOfStock);

  const inStockPct = Math.round((inStock / total) * 100);
  const lowStockPct = Math.round((lowStock / total) * 100);
  const outOfStockPct = Math.max(0, 100 - inStockPct - lowStockPct);

  // SVG dash array calculation (circumference = 2 * PI * 14 ~= 87.96 -> scaled to 100)
  const inStockDash = `${inStockPct} 100`;
  const lowStockDash = `${lowStockPct} 100`;
  const outOfStockDash = `${outOfStockPct} 100`;

  const inStockOffset = 0;
  const lowStockOffset = -inStockPct;
  const outOfStockOffset = -(inStockPct + lowStockPct);

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-[#1E293B] bg-[#111827] p-6 shadow-panel">
      <div className="flex items-center justify-between">
        <h3 className="font-sans text-sm font-bold text-white">Inventory Summary</h3>
        <span className="rounded-md bg-[#1E293B] px-2 py-0.5 font-mono text-[10px] text-slate-400">Live Inventory</span>
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
            {/* In Stock Segment */}
            {inStockPct > 0 && (
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke="#10B981"
                strokeWidth="4"
                strokeDasharray={inStockDash}
                strokeDashoffset={inStockOffset}
                strokeLinecap="round"
              />
            )}
            {/* Low Stock Segment */}
            {lowStockPct > 0 && (
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke="#F59E0B"
                strokeWidth="4"
                strokeDasharray={lowStockDash}
                strokeDashoffset={lowStockOffset}
                strokeLinecap="round"
              />
            )}
            {/* Out of Stock Segment */}
            {outOfStockPct > 0 && (
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke="#EF4444"
                strokeWidth="4"
                strokeDasharray={outOfStockDash}
                strokeDashoffset={outOfStockOffset}
                strokeLinecap="round"
              />
            )}
          </svg>

          <div className="absolute flex flex-col items-center">
            <span className="font-mono text-xl font-bold text-white">
              {total.toLocaleString()}
            </span>
            <span className="font-sans text-[10px] text-slate-400">Items</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-3 font-sans text-xs">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50" />
            <div className="flex flex-col">
              <span className="font-semibold text-slate-200">In Stock (&gt;10)</span>
              <span className="font-mono text-[11px] text-slate-400">
                {inStock.toLocaleString()} ({inStockPct}%)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-amber-500 shadow-xs shadow-amber-500/50" />
            <div className="flex flex-col">
              <span className="font-semibold text-slate-200">Low Stock (1-10)</span>
              <span className="font-mono text-[11px] text-slate-400">
                {lowStock.toLocaleString()} ({lowStockPct}%)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-rose-500 shadow-xs shadow-rose-500/50" />
            <div className="flex flex-col">
              <span className="font-semibold text-slate-200">Out of Stock (0)</span>
              <span className="font-mono text-[11px] text-slate-400">
                {outOfStock.toLocaleString()} ({outOfStockPct}%)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
