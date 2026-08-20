import Link from "next/link";
import Image from "next/image";
import { formatMoney } from "@/lib/payments/money";

export interface ProductCardData {
  slug: string;
  title: string;
  imageUrl: string | null;
  imageAlt: string;
  minPriceAmount: number;
  maxPriceAmount: number;
  currency: string;
  totalOnHand: number;
  colors?: string[];
}

export function ProductCard({
  product,
  priority = false,
}: {
  product: ProductCardData;
  priority?: boolean;
}) {
  const priceLabel =
    product.minPriceAmount === product.maxPriceAmount
      ? formatMoney({ amount: product.minPriceAmount, currency: product.currency })
      : `From ${formatMoney({ amount: product.minPriceAmount, currency: product.currency })}`;

  // Default clean neutral swatches if none passed
  const colorDots = product.colors ?? ["#1F2937", "#9CA3AF", "#D1D5DB"];

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col transition-all duration-300"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-gray-100 border border-gray-200/70 shadow-sm transition-all duration-500 group-hover:shadow-md group-hover:border-gray-300">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.imageAlt}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="skeleton h-full w-full" />
        )}

        {product.totalOnHand <= 0 && (
          <div className="absolute top-3 left-3 rounded-full bg-black/80 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur">
            Sold out
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-1.5 px-0.5">
        {/* Color preview dots */}
        <div className="flex items-center gap-1.5 py-0.5">
          {colorDots.slice(0, 4).map((c, i) => (
            <span
              key={i}
              className="h-2.5 w-2.5 rounded-full border border-black/10 shadow-xs"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <div className="flex items-start justify-between gap-2">
          <h3 className="font-sans text-sm font-medium text-gray-900 transition-colors group-hover:text-black group-hover:underline">
            {product.title}
          </h3>
          <span className="shrink-0 font-sans text-sm font-semibold text-gray-900">
            {priceLabel}
          </span>
        </div>
      </div>
    </Link>
  );
}
