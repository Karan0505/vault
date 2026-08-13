import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ArrowRight, ShieldCheck, Zap, Layers, RefreshCw } from "lucide-react";

export const metadata: Metadata = {
  title: "VAULT — Archival Essentials",
};

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
    <div className="flex flex-col gap-16 py-4">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden rounded-3xl border border-ink-800 bg-gradient-to-b from-ink-900/80 via-ink-900/40 to-ink-950/90 p-8 md:p-12 shadow-vault">
        <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-brass-400/5 blur-3xl pointer-events-none" />
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-brass-400/30 bg-brass-400/10 px-3 py-1 text-xs font-mono text-brass-300">
              <span className="h-1.5 w-1.5 rounded-full bg-brass-400 animate-pulse" />
              ARCHIVAL COLLECTION 2026
            </div>
            <h1 className="mt-6 font-display text-4xl italic leading-[1.08] text-ink-50 sm:text-6xl">
              Held to the same standard as a vault door.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-ink-300">
              Architectural apparel & footwear designed for longevity. Every price, stock level,
              and reservation is authoritative and verified server-side in real time.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/search"
                className="inline-flex items-center gap-2 rounded-xl bg-brass-400 px-6 py-3.5 font-sans text-sm font-semibold text-ink-950 transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Shop Collection <ArrowRight size={16} />
              </Link>
              <Link
                href="/categories/outerwear"
                className="inline-flex items-center gap-2 rounded-xl border border-ink-700 bg-ink-900/60 px-6 py-3.5 text-sm font-medium text-ink-100 transition-colors hover:border-ink-600 hover:bg-ink-800/80"
              >
                View Outerwear
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-ink-700/80 bg-ink-950/70 p-6 backdrop-blur-sm shadow-xl">
            <div className="flex items-center justify-between border-b border-ink-800 pb-4">
              <p className="eyebrow text-brass-300">System Ledger</p>
              <span className="rounded-md bg-signal-green/10 px-2 py-0.5 font-mono text-[11px] font-medium text-signal-green">
                ONLINE
              </span>
            </div>
            <dl className="mt-4 flex flex-col gap-3.5 font-mono text-xs">
              <div className="flex justify-between border-b border-dashed border-ink-800 pb-3">
                <dt className="text-ink-400 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-brass-400" /> Pricing Engine
                </dt>
                <dd className="text-ink-100">Server Authoritative</dd>
              </div>
              <div className="flex justify-between border-b border-dashed border-ink-800 pb-3">
                <dt className="text-ink-400 flex items-center gap-1.5">
                  <Zap size={14} className="text-brass-400" /> Caching Strategy
                </dt>
                <dd className="text-ink-100">Tag-Based ISR</dd>
              </div>
              <div className="flex justify-between border-b border-dashed border-ink-800 pb-3">
                <dt className="text-ink-400 flex items-center gap-1.5">
                  <RefreshCw size={14} className="text-brass-400" /> Stock Sync
                </dt>
                <dd className="text-ink-100">Real-Time Atomic</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-400 flex items-center gap-1.5">
                  <Layers size={14} className="text-brass-400" /> Currency
                </dt>
                <dd className="text-ink-100">Explicit USD</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* FEATURED CATEGORIES SECTION */}
      <section className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="eyebrow">Catalogue</p>
            <h2 className="mt-1 font-display text-2xl italic text-ink-50">Featured Categories</h2>
          </div>
          <Link href="/search" className="text-xs font-mono text-brass-300 hover:text-brass-200">
            View all products →
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {categories.length === 0 && (
            <p className="col-span-3 text-sm text-ink-500">
              No categories yet — create one from the ops console to see it here.
            </p>
          )}
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/categories/${category.slug}`}
              className="group flex flex-col justify-between rounded-2xl border border-ink-800 bg-ink-900/40 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brass-400/50 hover:bg-ink-900/70"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="eyebrow">{category._count.products} pieces</span>
                  <ArrowRight size={16} className="text-ink-600 transition-colors group-hover:text-brass-300" />
                </div>
                <h3 className="mt-4 font-display text-2xl text-ink-50 transition-colors group-hover:text-brass-300">
                  {category.name}
                </h3>
                {category.description && (
                  <p className="mt-2 text-sm text-ink-400 line-clamp-2">{category.description}</p>
                )}
              </div>
              <div className="mt-6 flex items-center gap-1 font-mono text-xs text-brass-400 opacity-0 transition-opacity group-hover:opacity-100">
                Explore collection →
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
