import Link from "next/link";
import Image from "next/image";
import { Heart, Star, ArrowRight } from "lucide-react";

export function BestSellers() {
  const products = [
    {
      name: "Essential Hoodie",
      price: "$69.00",
      rating: "5.0",
      reviews: 120,
      image: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&q=80",
      colors: ["#111827", "#9CA3AF", "#F3F4F6"],
      slug: "hoodie-black",
    },
    {
      name: "Oversized Tee",
      price: "$29.00",
      rating: "4.9",
      reviews: 95,
      image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80",
      colors: ["#111827", "#F3F4F6"],
      slug: "t-shirt-white",
    },
    {
      name: "Denim Jacket",
      price: "$109.00",
      rating: "4.8",
      reviews: 78,
      image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&q=80",
      colors: ["#1E3A8A", "#172554"],
      slug: "jacket-denim",
    },
    {
      name: "Classic Backpack",
      price: "$89.00",
      rating: "5.0",
      reviews: 106,
      image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80",
      colors: ["#111827", "#6B7280"],
      slug: "backpack-black",
    },
    {
      name: "Leather Sneakers",
      price: "$131.00",
      rating: "4.9",
      reviews: 41,
      image: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=600&q=80",
      colors: ["#111827", "#F3F4F6"],
      slug: "sneakers-white",
    },
    {
      name: "Cargo Pants",
      price: "$79.00",
      rating: "4.8",
      reviews: 58,
      image: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&q=80",
      colors: ["#3F6212", "#111827"],
      slug: "pants-olive",
    },
  ];

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="font-sans text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
          Best Sellers
        </h2>
        <Link
          href="/search"
          className="group inline-flex items-center gap-1 font-sans text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          <span>View all products</span>
          <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {products.map((item) => (
          <div
            key={item.name}
            className="group relative flex flex-col rounded-2xl border border-gray-200/80 bg-white p-2.5 shadow-2xs transition-all duration-300 hover:border-gray-300 hover:shadow-md"
          >
            {/* Wishlist button */}
            <button
              type="button"
              aria-label="Add to wishlist"
              className="absolute top-4 right-4 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-gray-600 backdrop-blur-sm transition-all hover:bg-white hover:text-rose-600 shadow-xs"
            >
              <Heart size={14} />
            </button>

            {/* Product Image */}
            <Link href="/search" className="relative aspect-square w-full overflow-hidden rounded-xl bg-gray-50">
              <Image
                src={item.image}
                alt={item.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(min-width: 1024px) 16vw, (min-width: 640px) 33vw, 50vw"
              />
            </Link>

            {/* Details */}
            <div className="mt-3 flex flex-col gap-1 px-1">
              <Link href="/search" className="font-sans text-xs font-bold text-gray-900 hover:underline line-clamp-1">
                {item.name}
              </Link>

              <div className="flex items-center justify-between">
                <span className="font-sans text-xs font-extrabold text-gray-900">
                  {item.price}
                </span>

                <div className="flex items-center gap-1 text-[10px] text-amber-500 font-medium">
                  <Star size={10} className="fill-amber-400 text-amber-400" />
                  <span className="text-gray-500 font-mono">({item.reviews})</span>
                </div>
              </div>

              {/* Color dots */}
              <div className="mt-1 flex items-center gap-1">
                {item.colors.map((c, i) => (
                  <span
                    key={i}
                    className="h-2 w-2 rounded-full border border-black/10 shadow-xs"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
