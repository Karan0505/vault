import "server-only";
import { stripe } from "@/lib/payments/stripe";
import { logger } from "@/lib/shared/logger";

export type StripeHealthStatus =
  | "Connected (Live)"
  | "Connected (Test Mode)"
  | "Not Configured"
  | "Unavailable";

export interface StripeStatusInfo {
  status: StripeHealthStatus;
  mode: "live" | "test" | "none";
  isConfigured: boolean;
  webhookConfigured: boolean;
}

/**
 * Derives real Stripe connectivity status on the server without exposing secret keys.
 */
export async function getStripeHealthStatus(): Promise<StripeStatusInfo> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey) {
    return {
      status: "Not Configured",
      mode: "none",
      isConfigured: false,
      webhookConfigured: Boolean(webhookSecret),
    };
  }

  const isTestMode = secretKey.startsWith("sk_test_") || secretKey.startsWith("rk_test_");
  const mode = isTestMode ? "test" : "live";

  try {
    // Ping Stripe API with a lightweight call (retrieve balance or account info)
    await stripe.balance.retrieve();

    return {
      status: isTestMode ? "Connected (Test Mode)" : "Connected (Live)",
      mode,
      isConfigured: true,
      webhookConfigured: Boolean(webhookSecret),
    };
  } catch (error) {
    logger.warn("stripe.health_check_failed", {
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      status: "Unavailable",
      mode,
      isConfigured: true,
      webhookConfigured: Boolean(webhookSecret),
    };
  }
}
