"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { Save, ChevronRight, Layers, DollarSign, Image as ImageIcon, Warehouse, Globe, FileText, Check } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select, Textarea } from "@/components/ui/Field";
import { VariantMatrixEditor, type VariantDraft } from "./VariantMatrixEditor";
import { ImageUploader, type MediaDraft } from "./ImageUploader";
import { slugify } from "@/lib/utils";

export interface CategoryOption {
  id: string;
  name: string;
}

export interface ProductFormValue {
  id?: string;
  title: string;
  slug: string;
  description: string;
  status: "draft" | "active" | "archived";
  categoryId: string | null;
  optionNames: string[];
  optionValues: Record<string, string[]>;
  variants: VariantDraft[];
  media: MediaDraft[];
}

interface ProductFormProps {
  categories: CategoryOption[];
  initialValue: ProductFormValue;
}

type TabType = "general" | "variants" | "pricing" | "media" | "inventory" | "seo";

export function ProductForm({ categories, initialValue }: ProductFormProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(Boolean(initialValue.id));

  const [title, setTitle] = useState(initialValue.title);
  const [slug, setSlug] = useState(initialValue.slug);
  const [description, setDescription] = useState(initialValue.description);
  const [status, setStatus] = useState(initialValue.status);
  const [categoryId, setCategoryId] = useState<string | null>(initialValue.categoryId);
  const [optionNames, setOptionNames] = useState(initialValue.optionNames);
  const [optionValues, setOptionValues] = useState(initialValue.optionValues);
  const [variants, setVariants] = useState<VariantDraft[]>(initialValue.variants);
  const [media, setMedia] = useState<MediaDraft[]>(initialValue.media);

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = {
      title,
      slug,
      description: description || null,
      status,
      categoryId,
      optionNames,
      variants: variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        options: v.options,
        priceAmount: v.priceAmount,
        priceCurrency: v.priceCurrency,
        compareAtAmount: v.compareAtAmount,
        isEnabled: v.isEnabled,
        onHand: v.onHand,
        lowStockThreshold: v.lowStockThreshold,
      })),
      media,
    };

    startTransition(async () => {
      const endpoint = initialValue.id ? `/api/admin/products/${initialValue.id}` : "/api/admin/products";
      const method = initialValue.id ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(typeof body.error === "string" ? body.error : "Could not save product. Check the fields above.");
        return;
      }

      router.push("/admin/products");
      router.refresh();
    });
  }

  const TABS = [
    { key: "general", label: "General", icon: FileText },
    { key: "variants", label: "Variants", icon: Layers },
    { key: "pricing", label: "Pricing", icon: DollarSign },
    { key: "media", label: "Media", icon: ImageIcon },
    { key: "inventory", label: "Inventory", icon: Warehouse },
    { key: "seo", label: "SEO", icon: Globe },
  ] as const;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 text-slate-100">
      {/* Header bar with breadcrumbs and Save CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#1E293B] pb-5">
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400">Products</span>
          <ChevronRight size={13} className="text-slate-600" />
          <span className="font-bold text-white">{title || "New Product"}</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 font-mono text-xs font-bold text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {status.toUpperCase()}
          </span>

          <button
            type="submit"
            disabled={isPending || variants.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2 text-xs font-semibold text-white shadow-glow hover:bg-indigo-500 disabled:opacity-40 transition-all cursor-pointer"
          >
            <Save size={14} />
            <span>{isPending ? "Saving…" : "Save"}</span>
          </button>
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-400"
        >
          {error}
        </motion.div>
      )}

      {/* Main Tabbed Layout */}
      <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
        {/* Left Vertical Tabs */}
        <aside className="flex flex-col gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as TabType)}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-colors text-left ${
                  isActive
                    ? "bg-[#1E293B] text-white shadow-xs"
                    : "text-slate-400 hover:bg-[#182235] hover:text-slate-200"
                }`}
              >
                <Icon size={15} className={isActive ? "text-indigo-400" : "text-slate-500"} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Right Tab Content */}
        <div className="flex flex-col gap-6">
          {activeTab === "general" && (
            <div className="flex flex-col gap-6">
              <div className="rounded-2xl border border-[#1E293B] bg-[#111827] p-6 shadow-panel">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-300">Title</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      placeholder="e.g. Essential Hoodie"
                      required
                      className="mt-1 w-full rounded-xl border border-[#1E293B] bg-[#0B0F19] px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-300">Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      placeholder="Detailed product description..."
                      className="mt-1 w-full rounded-xl border border-[#1E293B] bg-[#0B0F19] px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300">Category</label>
                    <select
                      value={categoryId ?? ""}
                      onChange={(e) => setCategoryId(e.target.value || null)}
                      className="mt-1 w-full rounded-xl border border-[#1E293B] bg-[#0B0F19] px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="">No category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as typeof status)}
                      className="mt-1 w-full rounded-xl border border-[#1E293B] bg-[#0B0F19] px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="active">Active — visible on storefront</option>
                      <option value="draft">Draft</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300">Handle / Slug</label>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => {
                        setSlugTouched(true);
                        setSlug(e.target.value);
                      }}
                      required
                      className="mt-1 w-full rounded-xl border border-[#1E293B] bg-[#0B0F19] px-3.5 py-2.5 font-mono text-xs text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300">Tags</label>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="rounded-lg bg-[#1E293B] px-2.5 py-1 font-mono text-[11px] text-slate-300">
                        hoodie
                      </span>
                      <span className="rounded-lg bg-[#1E293B] px-2.5 py-1 font-mono text-[11px] text-slate-300">
                        cotton
                      </span>
                      <span className="rounded-lg bg-[#1E293B] px-2.5 py-1 font-mono text-[11px] text-slate-300">
                        casual
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Media Preview Card */}
              <div className="rounded-2xl border border-[#1E293B] bg-[#111827] p-6 shadow-panel">
                <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                  Primary Media
                </h3>
                <div className="flex items-center gap-6">
                  <div className="relative h-32 w-28 overflow-hidden rounded-xl bg-[#0B0F19] border border-[#1E293B]">
                    {media[0]?.url ? (
                      <Image src={media[0].url} alt="" fill className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-500 text-xs">
                        No image
                      </div>
                    )}
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("media")}
                      className="rounded-xl border border-[#1E293B] bg-[#1E293B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#334155] transition-colors"
                    >
                      Change image
                    </button>
                    <p className="mt-2 text-[11px] text-slate-400">
                      Upload high-res PNG or JPG files up to 10MB.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "variants" && (
            <div className="rounded-2xl border border-[#1E293B] bg-[#111827] p-6 shadow-panel">
              <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                Variant Matrix Editor
              </h3>
              <VariantMatrixEditor
                productSlug={slug}
                optionNames={optionNames}
                optionValues={optionValues}
                variants={variants}
                onOptionNamesChange={setOptionNames}
                onOptionValuesChange={setOptionValues}
                onVariantsChange={setVariants}
              />
            </div>
          )}

          {activeTab === "pricing" && (
            <div className="rounded-2xl border border-[#1E293B] bg-[#111827] p-6 shadow-panel">
              <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                Pricing Overview
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                All pricing is stored in integer minor units (cents) and computed server-authoritatively.
              </p>
              <div className="flex flex-col divide-y divide-[#1E293B]">
                {variants.map((v, idx) => (
                  <div key={v.id ?? `${v.sku}-${idx}`} className="flex items-center justify-between py-3 text-xs">
                    <span className="font-mono text-slate-300">{v.sku}</span>
                    <span className="font-mono font-bold text-white">
                      ${(v.priceAmount / 100).toFixed(2)} {v.priceCurrency}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "media" && (
            <div className="rounded-2xl border border-[#1E293B] bg-[#111827] p-6 shadow-panel">
              <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                Media Gallery
              </h3>
              <ImageUploader images={media} onChange={setMedia} />
            </div>
          )}

          {activeTab === "inventory" && (
            <div className="rounded-2xl border border-[#1E293B] bg-[#111827] p-6 shadow-panel">
              <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                Inventory Levels
              </h3>
              <div className="flex flex-col divide-y divide-[#1E293B]">
                {variants.map((v, idx) => (
                  <div key={v.id ?? `${v.sku}-${idx}`} className="flex items-center justify-between py-3 text-xs">
                    <span className="font-mono text-slate-300">{v.sku}</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {v.onHand} units on hand
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "seo" && (
            <div className="rounded-2xl border border-[#1E293B] bg-[#111827] p-6 shadow-panel">
              <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                Search Engine Optimization
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Page Title</label>
                  <input
                    type="text"
                    defaultValue={`${title} · VAULT`}
                    className="mt-1 w-full rounded-xl border border-[#1E293B] bg-[#0B0F19] px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300">Meta Description</label>
                  <textarea
                    defaultValue={description}
                    rows={3}
                    className="mt-1 w-full rounded-xl border border-[#1E293B] bg-[#0B0F19] px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}

