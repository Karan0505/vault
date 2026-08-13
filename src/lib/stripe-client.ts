import { loadStripe, type Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | undefined;

/** Lazily loaded, memoized Stripe.js instance for the checkout page. */
export function getStripeClient(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      console.warn("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable is not set");
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(key).catch((err) => {
      console.error("Failed to load Stripe.js SDK from CDN:", err);
      stripePromise = undefined;
      return null;
    });
  }
  return stripePromise;
}
