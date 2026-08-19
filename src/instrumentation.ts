import * as Sentry from "@sentry/nextjs";

/**
 * Next.js 15's instrumentation hook — called once when the server
 * starts, before any request is handled. Sentry initialization is
 * conditional on SENTRY_DSN being set, the same graceful-degradation
 * pattern used for Stripe (lib/stripe.ts), Resend (lib/email.server.ts),
 * and UploadThing elsewhere in this project: local dev, CI, and this
 * sandbox all run with no error-tracking backend configured, and none
 * of them should have to fight the app to do it.
 */
export async function register() {
  if (!process.env.SENTRY_DSN) return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
      // Order/payment/refund code paths are exactly where a silent
      // failure is most expensive — see the explicit captureException
      // calls in the admin API routes for orders, refunds, and
      // inventory adjustments.
      environment: process.env.NODE_ENV,
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
      environment: process.env.NODE_ENV,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
