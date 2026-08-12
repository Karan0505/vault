import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";

async function getStats() {
  const [productCount, activeCount, categoryCount, lowStock] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { status: "active" } }),
    prisma.category.count(),
    prisma.inventoryItem.findMany({
      orderBy: { onHand: "asc" },
      include: { variant: { include: { product: true } } },
      take: 500,
    }),
  ]);

  const lowStockVariants = lowStock.filter(
    (item) => item.onHand <= Math.max(5, item.lowStockThreshold)
  );

  return { productCount, activeCount, categoryCount, lowStockVariants };
}

export default async function AdminDashboardPage() {
  const { productCount, activeCount, categoryCount, lowStockVariants } = await getStats();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="eyebrow">Overview</p>
        <h1 className="mt-2 font-display text-3xl text-ink-50">Catalogue at a glance</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs text-ink-500">Total products</p>
          <p className="mt-2 font-display text-3xl text-ink-50">{productCount}</p>
        </Card>
        <Card>
          <p className="text-xs text-ink-500">Published (active)</p>
          <p className="mt-2 font-display text-3xl text-ink-50">{activeCount}</p>
        </Card>
        <Card>
          <p className="text-xs text-ink-500">Categories</p>
          <p className="mt-2 font-display text-3xl text-ink-50">{categoryCount}</p>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <p className="font-display text-lg text-ink-100">Low stock</p>
          <Badge tone="amber">{lowStockVariants.length} variants</Badge>
        </div>
        <div className="mt-4 flex max-h-[420px] flex-col divide-y divide-ink-800 overflow-y-auto pr-1">
          {lowStockVariants.length === 0 && (
            <p className="py-6 text-sm text-ink-500">Nothing below threshold right now.</p>
          )}
          {lowStockVariants.map((item) => {
            const optionsText = Object.values(item.variant.options as Record<string, string>).join(" / ");
            return (
              <Link
                key={item.id}
                href={`/admin/products/${item.variant.productId}/edit`}
                className="flex items-center justify-between py-3 text-sm transition-colors hover:text-brass-300"
              >
                <span className="text-ink-200">
                  {item.variant.product.title} {optionsText ? `(${optionsText})` : ""}
                </span>
                <span className="font-mono text-xs text-ink-500">
                  {item.variant.sku} · {item.onHand <= 0 ? "Out of stock" : `${item.onHand} on hand`}
                </span>
              </Link>
            );
          })}
        </div>
      </Card>

      <Card className="flex items-center justify-between">
        <div>
          <p className="font-display text-lg text-ink-100">Add to the catalogue</p>
          <p className="mt-1 text-sm text-ink-500">
            New products publish to the storefront within seconds via tag-based revalidation.
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="rounded-full bg-brass-400 px-5 py-2.5 text-sm font-medium text-ink-950 transition-colors hover:bg-brass-300"
        >
          New product
        </Link>
      </Card>
    </div>
  );
}
