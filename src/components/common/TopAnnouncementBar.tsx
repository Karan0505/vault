import { Truck, RotateCcw, ShieldCheck } from "lucide-react";

export function TopAnnouncementBar() {
  return (
    <div className="border-b border-gray-200 bg-gray-50/80 px-4 py-2 text-[11px] font-medium text-gray-600">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-2">
        <div className="flex items-center gap-1.5">
          <Truck size={13} className="text-gray-500" />
          <span>Free shipping on orders over $75</span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5">
          <RotateCcw size={12} className="text-gray-500" />
          <span>Fast & easy returns — 30 days return policy</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={13} className="text-emerald-600" />
          <span>Secure checkout — Powered by Stripe</span>
        </div>
      </div>
    </div>
  );
}
