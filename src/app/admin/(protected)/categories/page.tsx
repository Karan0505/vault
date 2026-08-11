import { prisma } from "@/lib/prisma";
import { CategoryCreateForm } from "@/components/admin/CategoryCreateForm";
import { Card } from "@/components/ui/Field";

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } }, parent: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="eyebrow">Catalogue</p>
        <h1 className="mt-2 font-display text-3xl text-ink-50">Categories</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="p-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink-800 text-xs uppercase tracking-wide text-ink-500">
                <th className="px-6 py-3.5 font-medium">Name</th>
                <th className="px-6 py-3.5 font-medium">Slug</th>
                <th className="px-6 py-3.5 font-medium">Parent</th>
                <th className="px-6 py-3.5 font-medium">Products</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {categories.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-ink-500">
                    No categories yet.
                  </td>
                </tr>
              )}
              {categories.map((category) => (
                <tr key={category.id} className="transition-colors hover:bg-ink-800/40">
                  <td className="px-6 py-4 text-ink-100">{category.name}</td>
                  <td className="px-6 py-4 font-mono text-xs text-ink-500">{category.slug}</td>
                  <td className="px-6 py-4 text-ink-400">{category.parent?.name ?? "—"}</td>
                  <td className="px-6 py-4 text-ink-400">{category._count.products}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <p className="eyebrow mb-4">New category</p>
          <CategoryCreateForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
        </Card>
      </div>
    </div>
  );
}
