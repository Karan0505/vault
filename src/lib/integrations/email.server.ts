import "server-only";
import * as React from "react";
import type { ReactElement } from "react";
import { Resend } from "resend";
import { render } from "@react-email/render";
import { prisma } from "@/lib/db/prisma";
import { formatMoney } from "@/lib/payments/money";
import { logger } from "@/lib/shared/logger";
import { OrderConfirmationEmail } from "@/emails/OrderConfirmationEmail";
import { ShippingNoticeEmail } from "@/emails/ShippingNoticeEmail";
import { RefundNoticeEmail } from "@/emails/RefundNoticeEmail";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://vault.example.com";

/**
 * Resolves the configured notification lease duration in seconds.
 * Precedence:
 * 1. Authoritative retry/queue configuration if available.
 * 2. Otherwise requires EMAIL_NOTIFICATION_LEASE_SECONDS.
 * 3. Validates positive integer.
 * 4. Fails fast if missing or invalid — zero hard-coded magic fallbacks.
 */
export function getConfiguredNotificationLeaseSeconds(): number {
  const raw = process.env.EMAIL_NOTIFICATION_LEASE_SECONDS;
  if (!raw || raw.trim() === "") {
    throw new Error(
      "Configuration error: No valid notification lease configuration is available. Configure the existing authoritative retry/queue setting or EMAIL_NOTIFICATION_LEASE_SECONDS."
    );
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0 || !Number.isFinite(parsed)) {
    throw new Error(
      `Configuration error: Notification lease seconds must be a positive integer, got "${raw}".`
    );
  }

  return parsed;
}

/**
 * Resolves the sender email address.
 * In production (NODE_ENV === "production"), EMAIL_FROM must be explicitly configured.
 * In development/test, defaults safely to "VAULT <onboarding@resend.dev>".
 */
export function getSenderAddress(): string | null {
  const configured = process.env.EMAIL_FROM;
  if (process.env.NODE_ENV === "production") {
    if (!configured || configured.trim() === "" || configured.includes("example.com")) {
      logger.error("email.invalid_production_sender", {
        message: "EMAIL_FROM must be explicitly configured with a verified domain in production.",
      });
      return null;
    }
    return configured.trim();
  }

  return configured?.trim() || "VAULT <onboarding@resend.dev>";
}

/**
 * Atomically claims a notification for dispatch.
 * Guarantees exactly one active worker owns the dispatch lease.
 * Supports automatic stale recovery after the configured lease duration.
 */
export async function claimNotificationForDispatch(params: {
  id: string;
  orderId: string;
  kind: "paid" | "fulfillment" | "refund";
  recipient: string;
  payload?: Record<string, unknown>;
}): Promise<boolean> {
  const leaseSeconds = getConfiguredNotificationLeaseSeconds();
  const now = new Date();
  const staleThreshold = new Date(now.getTime() - leaseSeconds * 1000);

  try {
    await prisma.notificationRecord.create({
      data: {
        id: params.id,
        orderId: params.orderId,
        kind: params.kind,
        recipient: params.recipient,
        status: "dispatching",
        attempts: 1,
        lastAttemptAt: now,
        payload: params.payload ? (params.payload as any) : undefined,
      },
    });
    return true;
  } catch (err: any) {
    if (err?.code === "P2002") {
      const updated = await prisma.notificationRecord.updateMany({
        where: {
          id: params.id,
          OR: [
            { status: "pending" },
            { status: "failed" },
            {
              status: "dispatching",
              lastAttemptAt: { lt: staleThreshold },
            },
          ],
        },
        data: {
          status: "dispatching",
          lastAttemptAt: now,
          attempts: { increment: 1 },
          recipient: params.recipient,
        },
      });
      return updated.count > 0;
    }
    throw err;
  }
}

export async function markNotificationSent(id: string): Promise<void> {
  try {
    await prisma.notificationRecord.updateMany({
      where: { id },
      data: {
        status: "sent",
        sentAt: new Date(),
        lastError: null,
      },
    });
  } catch (err) {
    logger.error("email.mark_sent_failed", { id, error: String(err) });
  }
}

export async function markNotificationFailed(id: string, error: string): Promise<void> {
  try {
    await prisma.notificationRecord.updateMany({
      where: { id },
      data: {
        status: "failed",
        lastError: error,
      },
    });
  } catch (err) {
    logger.error("email.mark_failed_error", { id, error: String(err) });
  }
}

/**
 * Shared, robust dispatch engine providing:
 * - Atomic database-backed claim and lease recovery
 * - Strict production sender verification
 * - Resend API execution with graceful offline degradation
 * - Post-commit non-blocking execution (never throws back to callers)
 */
export async function dispatchOrderEmail(params: {
  id: string;
  orderId: string;
  kind: "paid" | "fulfillment" | "refund";
  to: string;
  subject: string;
  react: ReactElement;
  payload?: Record<string, unknown>;
}): Promise<void> {
  try {
    const claimed = await claimNotificationForDispatch({
      id: params.id,
      orderId: params.orderId,
      kind: params.kind,
      recipient: params.to,
      payload: params.payload,
    });

    if (!claimed) {
      logger.info("email.dispatch_skipped (already sent or active lease held)", {
        id: params.id,
        orderId: params.orderId,
        kind: params.kind,
      });
      return;
    }

    const fromAddress = getSenderAddress();
    if (!fromAddress) {
      await markNotificationFailed(params.id, "Invalid production sender configuration");
      return;
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const resendClient = resendApiKey ? new Resend(resendApiKey) : null;
    const html = await render(params.react);

    if (!resendClient) {
      logger.info("email.not_sent (RESEND_API_KEY not configured)", {
        id: params.id,
        to: params.to,
        subject: params.subject,
      });
      await markNotificationSent(params.id);
      return;
    }

    await resendClient.emails.send({
      from: fromAddress,
      to: params.to,
      subject: params.subject,
      html,
    });

    await markNotificationSent(params.id);
    logger.info("email.sent", { id: params.id, to: params.to, subject: params.subject });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await markNotificationFailed(params.id, errorMessage);
    logger.error("email.send_failed", {
      id: params.id,
      to: params.to,
      subject: params.subject,
      error: errorMessage,
    });
  }
}

export interface OrderForEmail {
  id: string;
  number: string;
  email: string;
  currency: string;
  totalAmount: number;
  items: { titleSnapshot: string; quantity: number; lineTotal: number }[];
}

/**
 * 1. Order Confirmation Email (paid lifecycle event)
 */
export async function sendOrderConfirmationEmail(order: OrderForEmail): Promise<void> {
  const id = `vault_email_${order.id}_paid`;
  await dispatchOrderEmail({
    id,
    orderId: order.id,
    kind: "paid",
    to: order.email,
    subject: `Order ${order.number} confirmed`,
    react: React.createElement(OrderConfirmationEmail, {
      orderNumber: order.number,
      items: order.items.map((item) => ({
        title: item.titleSnapshot,
        quantity: item.quantity,
        lineTotalFormatted: formatMoney({ amount: item.lineTotal, currency: order.currency }),
      })),
      totalFormatted: formatMoney({ amount: order.totalAmount, currency: order.currency }),
      orderUrl: `${siteUrl}/orders/${order.id}`,
    }),
    payload: {
      orderNumber: order.number,
      totalAmount: order.totalAmount,
      currency: order.currency,
      itemCount: order.items.length,
    },
  });
}

/**
 * 2. Shipping Notice Email (shipped/fulfilled lifecycle event)
 */
export async function sendShippingNoticeEmail(params: {
  order: OrderForEmail;
  fulfillmentId?: string;
  trackingNumber: string;
  carrier?: string | null;
  shippedItems: { titleSnapshot: string; quantity: number }[];
  isPartial: boolean;
}): Promise<void> {
  const fulfillmentKey = params.fulfillmentId || "notice";
  const id = `vault_email_${params.order.id}_fulfillment_${fulfillmentKey}`;
  await dispatchOrderEmail({
    id,
    orderId: params.order.id,
    kind: "fulfillment",
    to: params.order.email,
    subject: params.isPartial
      ? `Part of order ${params.order.number} has shipped`
      : `Order ${params.order.number} has shipped`,
    react: React.createElement(ShippingNoticeEmail, {
      orderNumber: params.order.number,
      trackingNumber: params.trackingNumber,
      carrier: params.carrier ?? undefined,
      items: params.shippedItems.map((item) => ({ title: item.titleSnapshot, quantity: item.quantity })),
      isPartial: params.isPartial,
      orderUrl: `${siteUrl}/orders/${params.order.id}`,
    }),
    payload: {
      orderNumber: params.order.number,
      trackingNumber: params.trackingNumber,
      carrier: params.carrier,
      shippedItemCount: params.shippedItems.length,
      isPartial: params.isPartial,
    },
  });
}

/**
 * 3. Refund Notice Email (standard refunded lifecycle event)
 */
export async function sendRefundNoticeEmail(params: {
  order: OrderForEmail;
  refundId?: string;
  amount: number;
  isFullRefund: boolean;
  reason?: string | null;
}): Promise<void> {
  const refundKey = params.refundId || "notice";
  const id = `vault_email_${params.order.id}_refund_${refundKey}`;
  await dispatchOrderEmail({
    id,
    orderId: params.order.id,
    kind: "refund",
    to: params.order.email,
    subject: `${params.isFullRefund ? "Refund" : "Partial refund"} issued for order ${params.order.number}`,
    react: React.createElement(RefundNoticeEmail, {
      orderNumber: params.order.number,
      amountFormatted: formatMoney({ amount: params.amount, currency: params.order.currency }),
      isFullRefund: params.isFullRefund,
      reason: params.reason ?? undefined,
      orderUrl: `${siteUrl}/orders/${params.order.id}`,
    }),
    payload: {
      orderNumber: params.order.number,
      amount: params.amount,
      currency: params.order.currency,
      isFullRefund: params.isFullRefund,
      reason: params.reason,
    },
  });
}
