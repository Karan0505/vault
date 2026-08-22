import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

export function ShopByCategory() {
  const categories = [
    {
      name: "All Clothing",
      count: "120+ items",
      image: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=400&q=80",
      href: "/search",
    },
    {
      name: "T-Shirts",
      count: "89+ items",
      image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=400&q=80",
      href: "/search?category=t-shirts",
    },
    {
      name: "Hoodies",
      count: "45+ items",
      image: "https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=400&q=80",
      href: "/search?category=hoodies",
    },
    {
      name: "Jackets",
      count: "32+ items",
      image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&q=80",
      href: "/categories/outerwear",
    },
    {
      name: "Pants",
      count: "38+ items",
      image: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400&q=80",
      href: "/search?category=pants",
    },
    {
      name: "Shoes",
      count: "50+ items",
      image: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=400&q=80",
      href: "/categories/footwear",
    },
    {
      name: "Accessories",
      count: "40+ items",
      image: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400&q=80",
      href: "/categories/accessories",
    },
  ];

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="font-sans text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
          Shop by Category
        </h2>
        <Link
          href="/search"
          className="group inline-flex items-center gap-1 font-sans text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          <span>View all categories</span>
          <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {categories.map((cat) => (
          <Link
            key={cat.name}
            href={cat.href}
            className="group flex flex-col items-center rounded-2xl border border-gray-200/80 bg-gray-50/60 p-3 text-center transition-all duration-300 hover:border-gray-300 hover:bg-white hover:shadow-md"
          >
            <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-white p-2">
              <Image
                src={cat.image}
                alt={cat.name}
                fill
                className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                sizes="(min-width: 1024px) 14vw, (min-width: 640px) 25vw, 50vw"
              />
            </div>
            <div className="mt-3 flex flex-col items-center">
              <span className="font-sans text-xs font-bold text-gray-900 group-hover:underline">
                {cat.name}
              </span>
              <span className="font-sans text-[11px] text-gray-500">
                {cat.count}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
