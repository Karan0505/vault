import { getRecommendationsForProduct } from "@/lib/recommendations/recommendations.server";
import { ProductGrid } from "./ProductGrid";

export async function RecommendationsRail({
  productId,
  categoryId,
}: {
  productId: string;
  categoryId: string | null;
}) {
  const recommendations = await getRecommendationsForProduct(productId, categoryId);
  if (recommendations.length === 0) return null;

  return (
    <section className="mt-20 border-t border-ink-800 pt-12">
      <p className="eyebrow">Frequently bought together</p>
      <h2 className="mt-2 font-display text-2xl text-ink-50">You might also like</h2>
      <div className="mt-8">
        <ProductGrid products={recommendations} priorityCount={0} />
      </div>
    </section>
  );
}

export function RecommendationsRailSkeleton() {
  return (
    <section className="mt-20 border-t border-ink-800 pt-12">
      <div className="skeleton h-6 w-48 rounded" />
      <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton aspect-[4/5] rounded-xl" />
        ))}
      </div>
    </section>
  );
}
