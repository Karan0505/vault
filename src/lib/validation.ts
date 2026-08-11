import { z } from "zod";

export const moneyAmountSchema = z
  .number()
  .int({ message: "Price must be an integer minor-unit amount (e.g. cents), never a decimal." })
  .nonnegative();

export const variantInputSchema = z.object({
  id: z.string().optional(), // present when editing an existing variant
  sku: z.string().min(1, "SKU is required"),
  options: z.record(z.string(), z.string()),
  priceAmount: moneyAmountSchema,
  priceCurrency: z.string().length(3).default("USD"),
  compareAtAmount: moneyAmountSchema.nullable().optional(),
  isEnabled: z.boolean().default(true),
  onHand: z.number().int().nonnegative().default(0),
  lowStockThreshold: z.number().int().nonnegative().default(5),
});

export const mediaInputSchema = z.object({
  url: z.string().url(),
  alt: z.string().default(""),
});

export const productInputSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug must be lowercase, hyphen-separated"),
  description: z.string().optional().nullable(),
  status: z.enum(["draft", "active", "archived"]).default("draft"),
  categoryId: z.string().nullable().optional(),
  optionNames: z.array(z.string().min(1)).max(3, "Phase 1 UI supports up to 3 option dimensions"),
  variants: z.array(variantInputSchema).min(1, "At least one variant is required"),
  media: z.array(mediaInputSchema).default([]),
});

export type ProductInput = z.infer<typeof productInputSchema>;
export type VariantInput = z.infer<typeof variantInputSchema>;

export const categoryInputSchema = z.object({
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  description: z.string().optional().nullable(),
  parentId: z.string().nullable().optional(),
  position: z.number().int().default(0),
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;
