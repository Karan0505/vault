import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";

export default async function AdminCollectionsPage() {
  const collections = await prisma.collection.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="eyebrow">Catalogue</p>
        <h1 className="mt-2 font-display text-3xl text-ink-50">Collections</h1>
        <p className="mt-2 max-w-lg text-sm text-ink-500">
          Manual curation is available from the schema today. A drag-to-curate editor and
          automatic rule builder are picked back up once merchandising rules are defined —
          this view is read-only for Phase 1.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {collections.length === 0 && (
          <Card className="sm:col-span-2">
            <p className="text-sm text-ink-500">No collections yet.</p>
          </Card>
        )}
        {collections.map((collection) => (
          <Card key={collection.id}>
            <div className="flex items-center justify-between">
              <p className="font-display text-lg text-ink-100">{collection.name}</p>
              <Badge tone={collection.isAutomatic ? "brass" : "neutral"}>
                {collection.isAutomatic ? "Automatic" : "Manual"}
              </Badge>
            </div>
            <p className="mt-1 font-mono text-xs text-ink-600">{collection.slug}</p>
            {collection.description && (
              <p className="mt-3 text-sm text-ink-400">{collection.description}</p>
            )}
            <p className="mt-4 text-xs text-ink-500">{collection._count.products} products</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
