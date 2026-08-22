import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/shared/logger";

export const storeSettingsSchema = z.object({
  storeName: z.string().min(1, "Store name is required").max(100),
  contactEmail: z.string().email("Invalid contact email"),
  currency: z.enum(["USD", "CAD", "GBP", "EUR", "INR", "AUD"]).default("USD"),
  timezone: z.string().default("America/Los_Angeles"),
  lowStockThreshold: z.number().int().min(1).max(1000).default(10),
  reservationTTL: z.number().int().min(1).max(120).default(10),
  freeShippingThreshold: z.number().int().min(0).default(0), // in minor units ($0 = free on all or disabled)
  orderConfirmationEmails: z.boolean().default(true),
  refundEmails: z.boolean().default(true),
  fulfillmentEmails: z.boolean().default(true),
});

export type StoreSettings = z.infer<typeof storeSettingsSchema>;

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  storeName: "VAULT",
  contactEmail: "support@vault.com",
  currency: "USD",
  timezone: "America/Los_Angeles",
  lowStockThreshold: 10,
  reservationTTL: 10,
  freeShippingThreshold: 7500, // $75.00
  orderConfirmationEmails: true,
  refundEmails: true,
  fulfillmentEmails: true,
};

const SETTINGS_KEY = "store_configuration";

/**
 * Retrieves the persisted store settings, merged safely with defaults.
 */
export async function getStoreSettings(): Promise<StoreSettings> {
  try {
    const record = await (prisma as any).systemSetting.findUnique({
      where: { key: SETTINGS_KEY },
    });

    if (!record || !record.value) {
      return DEFAULT_STORE_SETTINGS;
    }

    const parsed = storeSettingsSchema.safeParse(record.value);
    if (!parsed.success) {
      logger.warn("settings.parse_fallback", { errors: parsed.error.flatten() });
      return { ...DEFAULT_STORE_SETTINGS, ...(typeof record.value === "object" ? record.value : {}) };
    }

    return parsed.data;
  } catch (error) {
    logger.error("settings.get_failed", { error: error instanceof Error ? error.message : String(error) });
    return DEFAULT_STORE_SETTINGS;
  }
}

/**
 * Updates store settings after validating against the strict Zod allowlist.
 */
export async function updateStoreSettings(input: unknown): Promise<StoreSettings> {
  const validated = storeSettingsSchema.parse(input);

  await (prisma as any).systemSetting.upsert({
    where: { key: SETTINGS_KEY },
    create: {
      key: SETTINGS_KEY,
      value: validated,
    },
    update: {
      value: validated,
    },
  });

  logger.info("settings.updated", { updatedSettings: Object.keys(validated) });
  return validated;
}
