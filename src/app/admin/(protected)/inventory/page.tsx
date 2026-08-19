import Link from "next/link";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { listInventory } from "@/lib/inventory-admin.server";
import { Card } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { AdjustStockForm } from "@/components/admin/AdjustStockForm";

interface InventoryPageProps {
  searchParams: Promise<{ lowStock?: string }>;
}

export default async function AdminInventoryPage({ searchParams }: InventoryPageProps) {
  const { lowStock } = await searchParams;
  const session = await auth();
  const canAdjust = hasPermission(session?.user.staffRole ?? null, "inventory:adjust");

  const items = await listInventory({ lowStockOnly: lowStock === "1" });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow">Operations</p>
          <h1 className="mt-2 font-display text-3xl text-ink-50">Inventory</h1>
        </div>
        <div className="flex gap-2 text-sm">
          <Link
            href="/admin/inventory"
            className={`rounded-full border px-3 py-1.5 ${!lowStock ? "border-brass-400 text-brass-300" : "border-ink-700 text-ink-400"}`}
          >
            All
          </Link>
          <Link
            href="/admin/inventory?lowStock=1"
            className={`rounded-full border px-3 py-1.5 ${lowStock === "1" ? "border-brass-400 text-brass-300" : "border-ink-700 text-ink-400"}`}
          >
            Low stock only
          </Link>
        </div>
      </div>

      <Card className="p-0">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-ink-800 text-xs uppercase tracking-wide text-ink-500">
              <th className="px-6 py-3.5 font-medium">Product</th>
              <th className="px-6 py-3.5 font-medium">SKU</th>
              <th className="px-6 py-3.5 font-medium">On hand</th>
              <th className="px-6 py-3.5 font-medium">Reserved</th>
              <th className="px-6 py-3.5 font-medium">Threshold</th>
              {canAdjust && <th className="px-6 py-3.5 font-medium">Adjust</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-800">
            {items.length === 0 && (
              <tr>
                <td colSpan={canAdjust ? 6 : 5} className="px-6 py-10 text-center text-ink-500">
                  Nothing here.
                </td>
              </tr>
            )}
            {items.map((item) => (
              <tr key={item.variantId} className="transition-colors hover:bg-ink-800/40">
                <td className="px-6 py-4">
                  <Link
                    href={`/admin/products/${item.productId}/edit`}
                    className="text-ink-100 transition-colors hover:text-brass-300"
                  >
                    {item.productTitle}
                  </Link>
                  <p className="font-mono text-xs text-ink-600">{Object.values(item.options).join(" / ")}</p>
                </td>
                <td className="px-6 py-4 font-mono text-xs text-ink-500">{item.sku}</td>
                <td className="px-6 py-4">
                  {item.onHand <= item.lowStockThreshold ? (
                    <Badge tone={item.onHand === 0 ? "red" : "amber"}>{item.onHand}</Badge>
                  ) : (
                    <span className="text-ink-300">{item.onHand}</span>
                  )}
                </td>
                <td className="px-6 py-4 text-ink-400">{item.reserved}</td>
                <td className="px-6 py-4 text-ink-500">{item.lowStockThreshold}</td>
                {canAdjust && (
                  <td className="px-6 py-4">
                    <AdjustStockForm variantId={item.variantId} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
