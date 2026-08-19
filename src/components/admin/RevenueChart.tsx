"use client";

import { useState } from "react";
import { TrendingUp } from "lucide-react";

export function RevenueChart() {
  const [timeframe, setTimeframe] = useState<"daily" | "weekly">("daily");

  const dailyPoints = [
    { date: "May 12", val: 12000, x: 20, y: 140 },
    { date: "May 13", val: 18500, x: 90, y: 80 },
    { date: "May 14", val: 14200, x: 160, y: 120 },
    { date: "May 15", val: 22400, x: 230, y: 50 },
    { date: "May 16", val: 19800, x: 300, y: 70 },
    { date: "May 17", val: 26500, x: 370, y: 25 },
    { date: "May 18", val: 24932, x: 440, y: 35 },
  ];

  const pathD = "M 20 140 C 55 110, 55 80, 90 80 C 125 80, 125 120, 160 120 C 195 120, 195 50, 230 50 C 265 50, 265 70, 300 70 C 335 70, 335 25, 370 25 C 405 25, 405 35, 440 35";
  const areaD = `${pathD} L 440 190 L 20 190 Z`;

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-[#1E293B] bg-[#111827] p-6 shadow-panel">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-sans text-sm font-bold text-white">Revenue Over Time</h3>
          <p className="font-mono text-xs text-slate-400 mt-0.5">Real-time captured revenue volume</p>
        </div>
        <div className="flex items-center gap-1 rounded-xl bg-[#0B0F19] p-1 border border-[#1E293B]">
          <button
            type="button"
            onClick={() => setTimeframe("daily")}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              timeframe === "daily" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            Daily
          </button>
          <button
            type="button"
            onClick={() => setTimeframe("weekly")}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              timeframe === "weekly" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            Weekly
          </button>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative w-full overflow-hidden pt-2">
        <svg viewBox="0 0 460 200" className="w-full overflow-visible">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818CF8" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#818CF8" stopOpacity="0.0" />
            </linearGradient>
            <filter id="chartGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#6366F1" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Grid lines */}
          <line x1="0" y1="30" x2="460" y2="30" stroke="#1E293B" strokeDasharray="3 3" />
          <line x1="0" y1="80" x2="460" y2="80" stroke="#1E293B" strokeDasharray="3 3" />
          <line x1="0" y1="130" x2="460" y2="130" stroke="#1E293B" strokeDasharray="3 3" />
          <line x1="0" y1="180" x2="460" y2="180" stroke="#1E293B" />

          {/* Area fill */}
          <path d={areaD} fill="url(#chartGradient)" />

          {/* Glowing line */}
          <path
            d={pathD}
            fill="none"
            stroke="#818CF8"
            strokeWidth="3"
            strokeLinecap="round"
            filter="url(#chartGlow)"
          />

          {/* Dots */}
          {dailyPoints.map((p, i) => (
            <g key={i} className="group cursor-pointer">
              <circle
                cx={p.x}
                cy={p.y}
                r="4.5"
                className="fill-[#111827] stroke-[#818CF8] stroke-[2.5] transition-transform duration-200 group-hover:scale-150"
              />
            </g>
          ))}
        </svg>

        {/* X Axis Labels */}
        <div className="mt-3 flex justify-between font-mono text-[10px] text-slate-500">
          {dailyPoints.map((p) => (
            <span key={p.date}>{p.date}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
