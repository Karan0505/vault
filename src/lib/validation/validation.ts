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

// ---------------------------------------------------------------------------
// Phase 2 — cart and checkout
// ---------------------------------------------------------------------------

export const addCartItemSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().positive().max(20),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(0).max(20),
});

export const applyDiscountSchema = z.object({
  code: z.string().min(1),
});

export const checkoutInputSchema = z.object({
  email: z.string().email(),
  discountCode: z.string().optional(),
});

export type CheckoutInput = z.infer<typeof checkoutInputSchema>;

// ---------------------------------------------------------------------------
// Phase 4 — order management, refunds, inventory adjustments
// ---------------------------------------------------------------------------

export const fulfilOrderSchema = z.object({
  trackingNumber: z.string().min(1),
  carrier: z.string().optional(),
  items: z
    .array(
      z.object({
        orderItemId: z.string().min(1),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
});

export const cancelOrderSchema = z.object({
  reason: z.string().optional(),
});

export const itemizedRefundSchema = z.object({
  kind: z.literal("itemized"),
  items: z
    .array(
      z.object({
        orderItemId: z.string().min(1),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
  reason: z.string().optional(),
  restock: z.boolean(),
});

export const goodwillRefundSchema = z.object({
  kind: z.literal("goodwill"),
  amount: z.number().int().positive(),
  reason: z.string().min(1),
});

export const refundInputSchema = z.discriminatedUnion("kind", [itemizedRefundSchema, goodwillRefundSchema]);

export const adjustStockSchema = z.object({
  delta: z.number().int().refine((n) => n !== 0, "delta must be non-zero"),
  reason: z.enum(["received", "damaged", "lost", "returned", "correction", "other"]),
  note: z.string().optional(),
});
