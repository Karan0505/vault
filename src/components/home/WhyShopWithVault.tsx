import { ShieldCheck, Clock, Tag, Leaf } from "lucide-react";

export function WhyShopWithVault() {
  const features = [
    {
      icon: ShieldCheck,
      title: "Premium Quality",
      desc: "Handpicked materials that last.",
    },
    {
      icon: Clock,
      title: "Timeless Design",
      desc: "Styles that never go out of fashion.",
    },
    {
      icon: Tag,
      title: "Fair Prices",
      desc: "Premium doesn't have to be expensive.",
    },
    {
      icon: Leaf,
      title: "Sustainable Choice",
      desc: "Better for you and the planet.",
    },
  ];

  return (
    <section className="flex flex-col items-center gap-8 py-6 border-t border-b border-gray-200/80">
      <h2 className="font-sans text-xl font-bold tracking-tight text-gray-900 sm:text-2xl text-center">
        Why Shop With VAULT?
      </h2>

      <div className="grid w-full gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f, idx) => {
          const Icon = f.icon;
          return (
            <div
              key={idx}
              className="flex items-start gap-3.5 rounded-2xl border border-gray-200/70 bg-white p-4 shadow-2xs"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-800">
                <Icon size={18} strokeWidth={1.8} />
              </div>
              <div className="flex flex-col text-left">
                <h3 className="font-sans text-xs font-bold text-gray-900">{f.title}</h3>
                <p className="mt-0.5 font-sans text-xs text-gray-500 leading-snug">{f.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
