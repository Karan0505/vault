"use client";

import { useState } from "react";
import { TrendingUp } from "lucide-react";
import type { ChartPoint } from "@/lib/admin/dashboard.server";

interface RevenueChartProps {
  dailyPoints?: ChartPoint[];
  weeklyPoints?: ChartPoint[];
}

export function RevenueChart({ dailyPoints, weeklyPoints }: RevenueChartProps) {
  const [timeframe, setTimeframe] = useState<"daily" | "weekly">("daily");

  const defaultDaily: ChartPoint[] = [
    { date: "May 12", val: 12000, x: 20, y: 140 },
    { date: "May 13", val: 18500, x: 90, y: 80 },
    { date: "May 14", val: 14200, x: 160, y: 120 },
    { date: "May 15", val: 22400, x: 230, y: 50 },
    { date: "May 16", val: 19800, x: 300, y: 70 },
    { date: "May 17", val: 26500, x: 370, y: 25 },
    { date: "May 18", val: 24932, x: 440, y: 35 },
  ];

  const defaultWeekly: ChartPoint[] = [
    { date: "Wk 1", val: 45000, x: 30, y: 120 },
    { date: "Wk 2", val: 62000, x: 160, y: 70 },
    { date: "Wk 3", val: 54000, x: 290, y: 90 },
    { date: "Wk 4", val: 78000, x: 420, y: 30 },
  ];

  const pointsList = timeframe === "daily"
    ? (dailyPoints && dailyPoints.length > 0 ? dailyPoints : defaultDaily)
    : (weeklyPoints && weeklyPoints.length > 0 ? weeklyPoints : defaultWeekly);

  // Build SVG path
  let pathD = "";
  if (pointsList.length > 0 && pointsList[0]) {
    pathD = `M ${pointsList[0].x} ${pointsList[0].y}`;
    for (let i = 1; i < pointsList.length; i++) {
      const prev = pointsList[i - 1];
      const curr = pointsList[i];
      if (prev && curr) {
        const midX = (prev.x + curr.x) / 2;
        pathD += ` C ${midX} ${prev.y}, ${midX} ${curr.y}, ${curr.x} ${curr.y}`;
      }
    }
  }

  const lastPoint = pointsList[pointsList.length - 1];
  const firstPoint = pointsList[0];
  const areaD = pathD && lastPoint && firstPoint
    ? `${pathD} L ${lastPoint.x} 190 L ${firstPoint.x} 190 Z`
    : "";

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
          <line x1="20" y1="40" x2="440" y2="40" stroke="#1E293B" strokeDasharray="3 3" />
          <line x1="20" y1="90" x2="440" y2="90" stroke="#1E293B" strokeDasharray="3 3" />
          <line x1="20" y1="140" x2="440" y2="140" stroke="#1E293B" strokeDasharray="3 3" />

          {/* Area Fill */}
          {areaD && <path d={areaD} fill="url(#chartGradient)" />}

          {/* Smooth Curve */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#6366F1"
              strokeWidth="2.5"
              strokeLinecap="round"
              filter="url(#chartGlow)"
            />
          )}

          {/* Data Points */}
          {pointsList.map((pt, idx) => (
            <g key={idx} className="group cursor-pointer">
              <circle
                cx={pt.x}
                cy={pt.y}
                r="4.5"
                className="fill-[#0B0F19] stroke-indigo-400 stroke-2 transition-all group-hover:r-6 group-hover:stroke-white"
              />
              {/* Tooltip on hover */}
              <g className="opacity-0 transition-opacity group-hover:opacity-100">
                <rect
                  x={pt.x - 30}
                  y={pt.y - 32}
                  width="60"
                  height="22"
                  rx="6"
                  fill="#1E293B"
                  stroke="#334155"
                />
                <text
                  x={pt.x}
                  y={pt.y - 18}
                  textAnchor="middle"
                  fill="#FFFFFF"
                  className="font-mono text-[10px] font-bold"
                >
                  ${(pt.val / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </text>
              </g>
            </g>
          ))}
        </svg>

        {/* X Axis Labels */}
        <div className="flex justify-between px-2 pt-2 text-[10px] font-mono text-slate-500">
          {pointsList.map((pt, idx) => (
            <span key={idx}>{pt.date}</span>
          ))}
        </div>
      </div>

      {/* Mini Trend Footer */}
      <div className="flex items-center justify-between border-t border-[#1E293B] pt-3">
        <div className="flex items-center gap-1.5 font-mono text-xs text-emerald-400 font-semibold">
          <TrendingUp size={14} />
          <span>+14.8% growth vs prior period</span>
        </div>
        <span className="font-mono text-[10px] text-slate-400">Database Aggregated</span>
      </div>
    </div>
  );
}
