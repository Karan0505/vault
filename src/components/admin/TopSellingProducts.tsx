import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

interface TopProduct {
  name: string;
  category: string;
  revenue: string;
  orders: number;
}

export function TopSellingProducts() {
  const products: TopProduct[] = [
    { name: "Minimal Watch", category: "Accessories", revenue: "$4,125.00", orders: 42 },
    { name: "Classic Backpack", category: "Accessories", revenue: "$3,546.00", orders: 48 },
    { name: "Leather Sneakers", category: "Footwear", revenue: "$3,128.00", orders: 31 },
    { name: "Wool Sweater", category: "Outerwear", revenue: "$2,890.00", orders: 27 },
  ];

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-[#1E293B] bg-[#111827] p-6 shadow-panel">
      <div>
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-3.5">
          <h3 className="font-sans text-sm font-bold text-white">Top Selling Products</h3>
          <span className="font-mono text-[10px] text-indigo-400 font-semibold">By Revenue</span>
        </div>

        <div className="mt-3 flex flex-col divide-y divide-[#1E293B]">
          {products.map((p, idx) => (
            <div key={idx} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1E293B] font-sans text-xs text-slate-300">
                  {idx + 1}
                </div>
                <div>
                  <h4 className="font-sans text-xs font-bold text-white">{p.name}</h4>
                  <p className="font-sans text-[11px] text-slate-400">{p.category} · {p.orders} orders</p>
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-indigo-300">{p.revenue}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 border-t border-[#1E293B] pt-3 text-center">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1 font-sans text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          <span>View all products</span>
          <ArrowUpRight size={13} />
        </Link>
      </div>
    </div>
  );
}
