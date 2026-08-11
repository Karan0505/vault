import Link from "next/link";
import Image from "next/image";
import { formatMoney } from "@/lib/money";

export interface ProductCardData {
  slug: string;
  title: string;
  imageUrl: string | null;
  imageAlt: string;
  minPriceAmount: number;
  maxPriceAmount: number;
  currency: string;
  totalOnHand: number;
}

export function ProductCard({ product }: { product: ProductCardData }) {
  const priceLabel =
    product.minPriceAmount === product.maxPriceAmount
      ? formatMoney({ amount: product.minPriceAmount, currency: product.currency })
      : `From ${formatMoney({ amount: product.minPriceAmount, currency: product.currency })}`;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block animate-fade-up"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-ink-800">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.imageAlt}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
          />
        ) : (
          <div className="skeleton h-full w-full" />
        )}
        {product.totalOnHand <= 0 && (
          <div className="absolute inset-x-3 top-3 rounded-full bg-ink-950/85 px-3 py-1 text-center font-mono text-[10px] uppercase tracking-widest2 text-ink-300 backdrop-blur">
            Sold out
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </div>

      <div className="mt-3 flex items-start justify-between gap-3">
        <h3 className="font-display text-[15px] leading-snug text-ink-100 transition-colors group-hover:text-brass-300">
          {product.title}
        </h3>
        <span className="whitespace-nowrap font-mono text-[13px] text-ink-300">{priceLabel}</span>
      </div>
    </Link>
  );
}
