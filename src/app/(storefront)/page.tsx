import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "VAULT",
};

// Category list changes rarely; a long revalidate window plus the
// admin-triggered tag invalidation on category writes keeps this both
// cheap to serve and correct on publish.
export const revalidate = 3600;

async function getFeaturedCategories() {
  return prisma.category.findMany({
    where: { parentId: null },
    orderBy: { position: "asc" },
    take: 3,
    include: { _count: { select: { products: true } } },
  });
}

export default async function HomePage() {
  const categories = await getFeaturedCategories();

  return (
    <div className="flex flex-col gap-20">
      <section className="grid gap-10 pt-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div>
          <p className="eyebrow animate-fade-up">Storefront · Phase 1</p>
          <h1
            className="mt-4 animate-fade-up font-display text-5xl italic leading-[1.05] text-ink-50 sm:text-6xl"
            style={{ animationDelay: "80ms" }}
          >
            Held to the same standard as a vault door.
          </h1>
          <p
            className="mt-6 max-w-md animate-fade-up text-sm leading-relaxed text-ink-400"
            style={{ animationDelay: "160ms" }}
          >
            Every price on this page was computed on the server, this second. Nothing here
            is decided by the browser — not the total, not the stock count, not the tax.
          </p>
        </div>
        <div
          className="animate-fade-up rounded-2xl border border-ink-700 bg-ink-900/60 p-6 shadow-vault"
          style={{ animationDelay: "220ms" }}
        >
          <p className="eyebrow">Ledger</p>
          <dl className="mt-4 flex flex-col gap-3 font-mono text-sm">
            <div className="flex justify-between border-b border-dashed border-ink-700 pb-3">
              <dt className="text-ink-400">Pricing</dt>
              <dd className="text-ink-100">Server authoritative</dd>
            </div>
            <div className="flex justify-between border-b border-dashed border-ink-700 pb-3">
              <dt className="text-ink-400">Caching</dt>
              <dd className="text-ink-100">Tag-based ISR</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-400">Currency</dt>
              <dd className="text-ink-100">Explicit, always</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {categories.length === 0 && (
          <p className="col-span-3 text-sm text-ink-500">
            No categories yet — create one from the ops console to see it here.
          </p>
        )}
        {categories.map((category, index) => (
          <Link
            key={category.id}
            href={`/categories/${category.slug}`}
            className="group animate-fade-up rounded-2xl border border-ink-800 bg-ink-900/40 p-6 transition-colors hover:border-brass-400/40"
            style={{ animationDelay: `${280 + index * 80}ms` }}
          >
            <p className="eyebrow">{category._count.products} pieces</p>
            <h2 className="mt-3 font-display text-2xl text-ink-50 transition-colors group-hover:text-brass-300">
              {category.name}
            </h2>
            {category.description && (
              <p className="mt-2 text-sm text-ink-500 line-clamp-2">{category.description}</p>
            )}
          </Link>
        ))}
      </section>
    </div>
  );
}
