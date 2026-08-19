import { Truck, RotateCcw, ShieldCheck, Headphones } from "lucide-react";

export function TrustBar() {
  const items = [
    {
      icon: Truck,
      title: "Free shipping",
      subtitle: "On orders over $75",
    },
    {
      icon: RotateCcw,
      title: "Easy returns",
      subtitle: "30 day returns",
    },
    {
      icon: ShieldCheck,
      title: "Secure checkout",
      subtitle: "Powered by Stripe",
    },
    {
      icon: Headphones,
      title: "Support",
      subtitle: "24/7 customer care",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-6 rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xs sm:grid-cols-4 sm:gap-8 lg:p-8">
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <div key={index} className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-50 border border-gray-200/60 text-gray-900">
              <Icon size={20} strokeWidth={1.75} />
            </div>
            <div>
              <h4 className="font-sans text-sm font-semibold text-gray-900">{item.title}</h4>
              <p className="font-sans text-xs text-gray-500">{item.subtitle}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
