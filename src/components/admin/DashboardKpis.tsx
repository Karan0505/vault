import { DollarSign, ShoppingCart, TrendingUp, Users } from "lucide-react";

interface KpiData {
  totalRevenue: string;
  orderCount: number;
  avgOrderValue: string;
  newCustomers: number;
}

export function DashboardKpis({ data }: { data?: Partial<KpiData> }) {
  const kpis = [
    {
      label: "Total Revenue",
      value: data?.totalRevenue ?? "$24,932.00",
      change: "+12.5% vs last 7 days",
      icon: DollarSign,
      trend: "up",
    },
    {
      label: "Orders",
      value: data?.orderCount !== undefined ? String(data.orderCount) : "312",
      change: "+8.1% vs last 7 days",
      icon: ShoppingCart,
      trend: "up",
    },
    {
      label: "Average Order Value",
      value: data?.avgOrderValue ?? "$78.63",
      change: "+4.2% vs last 7 days",
      icon: TrendingUp,
      trend: "up",
    },
    {
      label: "New Customers",
      value: data?.newCustomers !== undefined ? String(data.newCustomers) : "128",
      change: "+15.2% vs last 7 days",
      icon: Users,
      trend: "up",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon;
        return (
          <div
            key={idx}
            className="flex flex-col justify-between rounded-2xl border border-[#1E293B] bg-[#111827] p-5 shadow-panel transition-all hover:border-[#334155]"
          >
            <div className="flex items-center justify-between">
              <span className="font-sans text-xs font-semibold text-slate-400">
                {kpi.label}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1E293B] text-indigo-400">
                <Icon size={16} />
              </div>
            </div>

            <div className="mt-4">
              <span className="font-mono text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                {kpi.value}
              </span>
              <div className="mt-2 flex items-center gap-1.5 font-mono text-[11px] font-medium text-emerald-400">
                <span>↗</span>
                <span>{kpi.change}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
