"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/Input";
import { Select, Textarea, Card } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
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

export function ProductForm({ categories, initialValue }: ProductFormProps) {
  const router = useRouter();
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

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-signal-red/40 bg-signal-red/10 px-4 py-3 text-sm text-signal-red"
        >
          {error}
        </motion.div>
      )}

      <Card>
        <p className="eyebrow mb-4">Details</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Title"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            required
          />
          <Input
            label="Slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            hint="Used in the storefront URL — /products/<slug>"
            required
          />
          <Select
            label="Category"
            value={categoryId ?? ""}
            onChange={(e) => setCategoryId(e.target.value || null)}
          >
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="draft">Draft</option>
            <option value="active">Active — visible on storefront</option>
            <option value="archived">Archived</option>
          </Select>
        </div>
        <div className="mt-4">
          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
        </div>
      </Card>

      <Card>
        <p className="eyebrow mb-4">Media</p>
        <ImageUploader images={media} onChange={setMedia} />
      </Card>

      <Card>
        <p className="eyebrow mb-4">Variants</p>
        <VariantMatrixEditor
          productSlug={slug}
          optionNames={optionNames}
          optionValues={optionValues}
          variants={variants}
          onOptionNamesChange={setOptionNames}
          onOptionValuesChange={setOptionValues}
          onVariantsChange={setVariants}
        />
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending || variants.length === 0}>
          {isPending ? "Saving…" : initialValue.id ? "Save changes" : "Create product"}
        </Button>
      </div>
    </form>
  );
}
