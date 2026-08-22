import Link from "next/link";
import Image from "next/image";

export function PromoBanners() {
  const banners = [
    {
      eyebrow: "Summer Collection",
      title: "Light. Breezy. Effortless.",
      cta: "Shop Collection",
      href: "/search",
      image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80",
      isDark: false,
    },
    {
      eyebrow: "Up to 40% Off",
      title: "End of Season Sale",
      cta: "Shop Sale",
      href: "/search",
      image: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&q=80",
      isDark: true,
    },
    {
      eyebrow: "New Accessories",
      title: "The Finishing Touch",
      cta: "Shop Accessories",
      href: "/categories/accessories",
      image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&q=80",
      isDark: false,
    },
  ];

  return (
    <section className="grid gap-6 sm:grid-cols-3">
      {banners.map((b, idx) => (
        <div
          key={idx}
          className="relative flex min-h-[220px] flex-col justify-between overflow-hidden rounded-3xl border border-gray-200/80 bg-gray-100 p-7 shadow-xs"
        >
          {/* Background image on the right/cover */}
          <div className="absolute inset-0 -z-0">
            <Image
              src={b.image}
              alt={b.title}
              fill
              className="object-cover object-right opacity-90 transition-transform duration-700 hover:scale-105"
              sizes="(min-width: 1024px) 33vw, 100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-gray-100 via-gray-100/90 to-transparent" />
          </div>

          <div className="relative z-10 flex flex-col items-start">
            <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-gray-600">
              {b.eyebrow}
            </span>
            <h3 className="mt-1.5 font-sans text-xl font-bold tracking-tight text-gray-950 max-w-[200px] leading-tight">
              {b.title}
            </h3>
          </div>

          <div className="relative z-10 mt-6">
            <Link
              href={b.href}
              className={`inline-flex items-center rounded-full px-5 py-2 text-xs font-semibold shadow-xs transition-all active:scale-[0.98] ${
                b.isDark
                  ? "bg-black text-white hover:bg-neutral-800"
                  : "border border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
              }`}
            >
              {b.cta}
            </Link>
          </div>
        </div>
      ))}
    </section>
  );
}
