import Link from "next/link";
import Image from "next/image";
import { Heart, ArrowRight } from "lucide-react";
import { getBestSellingProducts } from "@/lib/catalogue/best-sellers.server";
import { formatMoney } from "@/lib/payments/money";

export async function BestSellers() {
  const products = await getBestSellingProducts(6);

  if (products.length === 0) {
    return null;
  }

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
        {products.map((item) => {
          const priceLabel = formatMoney({
            amount: item.minPriceAmount,
            currency: item.currency,
          });

          return (
            <div
              key={item.id}
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
              <Link
                href={`/products/${item.slug}`}
                className="relative aspect-square w-full overflow-hidden rounded-xl bg-gray-50"
              >
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.imageAlt}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(min-width: 1024px) 16vw, (min-width: 640px) 33vw, 50vw"
                  />
                ) : (
                  <div className="h-full w-full bg-gray-100 flex items-center justify-center text-xs text-gray-400">
                    No image
                  </div>
                )}
              </Link>

              {/* Details */}
              <div className="mt-3 flex flex-col gap-1 px-1">
                <Link
                  href={`/products/${item.slug}`}
                  className="font-sans text-xs font-bold text-gray-900 hover:underline line-clamp-1"
                >
                  {item.title}
                </Link>

                <div className="flex items-center justify-between">
                  <span className="font-sans text-xs font-extrabold text-gray-900">
                    {priceLabel}
                  </span>

                  {item.totalOnHand <= 0 && (
                    <span className="font-mono text-[10px] font-semibold text-rose-600">
                      Sold out
                    </span>
                  )}
                </div>

                {/* Color dots */}
                {item.colors && item.colors.length > 0 && (
                  <div className="mt-1 flex items-center gap-1">
                    {item.colors.slice(0, 4).map((c, i) => (
                      <span
                        key={i}
                        className="h-2 w-2 rounded-full border border-black/10 shadow-xs"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
