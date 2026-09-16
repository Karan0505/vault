import {
  AnimatedTruck,
  AnimatedReturns,
  AnimatedShield,
  AnimatedHeadphones,
} from "@/components/animations";

export function TrustBar() {
  const items = [
    {
      component: AnimatedTruck,
      title: "Free shipping",
      subtitle: "On orders over $75",
    },
    {
      component: AnimatedReturns,
      title: "Easy returns",
      subtitle: "30 day returns",
    },
    {
      component: AnimatedShield,
      title: "Secure checkout",
      subtitle: "Powered by Stripe",
    },
    {
      component: AnimatedHeadphones,
      title: "Support",
      subtitle: "24/7 customer care",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-6 rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xs sm:grid-cols-4 sm:gap-8 lg:p-8">
      {items.map((item, index) => {
        const IconComponent = item.component;

        return (
          <div key={index} className="group flex items-center gap-4 cursor-default">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-50 border border-gray-200/60 text-gray-900 transition-colors duration-200 group-hover:bg-black group-hover:text-white group-hover:border-black">
              <IconComponent size={20} strokeWidth={1.75} />
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
