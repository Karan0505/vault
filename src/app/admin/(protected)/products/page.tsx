import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { Card } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/payments/money";

async function getProducts() {
  return prisma.product.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      category: true,
      variants: { include: { inventoryItem: true } },
    },
  });
}

const statusTone = {
  active: "green",
  draft: "amber",
  archived: "neutral",
} as const;

export default async function AdminProductsPage() {
  const products = await getProducts();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow">Catalogue</p>
          <h1 className="mt-2 font-display text-3xl text-ink-50">Products</h1>
        </div>
        <Link
          href="/admin/products/new"
          className="rounded-full bg-brass-400 px-5 py-2.5 text-sm font-medium text-ink-950 transition-colors hover:bg-brass-300"
        >
          New product
        </Link>
      </div>

      <Card className="p-0">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-ink-800 text-xs uppercase tracking-wide text-ink-500">
              <th className="px-6 py-3.5 font-medium">Product</th>
              <th className="px-6 py-3.5 font-medium">Category</th>
              <th className="px-6 py-3.5 font-medium">Variants</th>
              <th className="px-6 py-3.5 font-medium">Price range</th>
              <th className="px-6 py-3.5 font-medium">Stock</th>
              <th className="px-6 py-3.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-800">
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-ink-500">
                  No products yet. Create your first one to see it here.
                </td>
              </tr>
            )}
            {products.map((product) => {
              const prices = product.variants.map((v) => v.priceAmount);
              const currency = product.variants[0]?.priceCurrency ?? "USD";
              const totalStock = product.variants.reduce(
                (sum, v) => sum + (v.inventoryItem?.onHand ?? 0),
                0
              );
              const min = prices.length ? Math.min(...prices) : 0;
              const max = prices.length ? Math.max(...prices) : 0;

              return (
                <tr key={product.id} className="transition-colors hover:bg-ink-800/40">
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/products/${product.id}/edit`}
                      className="font-medium text-ink-100 transition-colors hover:text-brass-300"
                    >
                      {product.title}
                    </Link>
                    <p className="font-mono text-xs text-ink-600">{product.slug}</p>
                  </td>
                  <td className="px-6 py-4 text-ink-400">{product.category?.name ?? "—"}</td>
                  <td className="px-6 py-4 text-ink-400">{product.variants.length}</td>
                  <td className="px-6 py-4 font-mono text-ink-300">
                    {min === max
                      ? formatMoney({ amount: min, currency })
                      : `${formatMoney({ amount: min, currency })}–${formatMoney({ amount: max, currency })}`}
                  </td>
                  <td className="px-6 py-4 text-ink-400">{totalStock}</td>
                  <td className="px-6 py-4">
                    <Badge tone={statusTone[product.status]}>{product.status}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
