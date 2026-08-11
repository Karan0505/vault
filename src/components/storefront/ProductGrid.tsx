import { ProductCard, type ProductCardData } from "./ProductCard";

export function ProductGrid({ products }: { products: ProductCardData[] }) {
  if (products.length === 0) {
    return (
      <div className="ledger-rule flex flex-col items-center gap-2 py-24 text-center">
        <p className="font-display text-lg text-ink-200">Nothing on the shelf yet</p>
        <p className="max-w-sm text-sm text-ink-500">
          Publish a product from the ops console and it will appear here within seconds.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product, index) => (
        <div key={product.slug} style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}>
          <ProductCard product={product} />
        </div>
      ))}
    </div>
  );
}
