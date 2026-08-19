import "server-only";
import type { ReactElement } from "react";
import { Resend } from "resend";
import { render } from "@react-email/render";
import { formatMoney } from "@/lib/money";
import { logger } from "@/lib/logger";
import { OrderConfirmationEmail } from "@/emails/OrderConfirmationEmail";
import { ShippingNoticeEmail } from "@/emails/ShippingNoticeEmail";
import { RefundNoticeEmail } from "@/emails/RefundNoticeEmail";

const FROM_ADDRESS = "VAULT <orders@vault.example.com>";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://vault.example.com";

const resendClient = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * All three send functions below share this shape: render the React
 * Email component to HTML, then hand it to Resend. If RESEND_API_KEY
 * isn't configured — local dev, CI, this sandbox — the email is logged
 * instead of sent rather than throwing, the same graceful-degradation
 * pattern Stripe and UploadThing already use elsewhere in this project
 * (see ADR 0019). None of these functions run inside the database
 * transaction that triggers them — see the call sites in
 * webhooks.server.ts, fulfillment routes, and refunds routes — so a
 * slow or failed email send can never hold open or roll back an order
 * mutation.
 */
async function sendEmail(params: { to: string; subject: string; react: ReactElement; logContext: Record<string, unknown> }): Promise<void> {
  const html = await render(params.react);

  if (!resendClient) {
    logger.info("email.not_sent (RESEND_API_KEY not configured)", {
      to: params.to,
      subject: params.subject,
      ...params.logContext,
    });
    return;
  }

  try {
    await resendClient.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      subject: params.subject,
      html,
    });
    logger.info("email.sent", { to: params.to, subject: params.subject, ...params.logContext });
  } catch (error) {
    // A failed email send should never fail the order/fulfilment/refund
    // action that triggered it — log it as an error (so it's visible
    // and alertable) and move on, rather than throwing back into a
    // caller that already committed the underlying state change.
    logger.error("email.send_failed", {
      to: params.to,
      subject: params.subject,
      error: error instanceof Error ? error.message : String(error),
      ...params.logContext,
    });
  }
}

interface OrderForEmail {
  id: string;
  number: string;
  email: string;
  currency: string;
  totalAmount: number;
  items: { titleSnapshot: string; quantity: number; lineTotal: number }[];
}

export async function sendOrderConfirmationEmail(order: OrderForEmail): Promise<void> {
  await sendEmail({
    to: order.email,
    subject: `Order ${order.number} confirmed`,
    react: OrderConfirmationEmail({
      orderNumber: order.number,
      items: order.items.map((item) => ({
        title: item.titleSnapshot,
        quantity: item.quantity,
        lineTotalFormatted: formatMoney({ amount: item.lineTotal, currency: order.currency }),
      })),
      totalFormatted: formatMoney({ amount: order.totalAmount, currency: order.currency }),
      orderUrl: `${siteUrl}/orders/${order.id}`,
    }),
    logContext: { orderId: order.id, kind: "order_confirmation" },
  });
}

export async function sendShippingNoticeEmail(params: {
  order: OrderForEmail;
  trackingNumber: string;
  carrier?: string | null;
  shippedItems: { titleSnapshot: string; quantity: number }[];
  isPartial: boolean;
}): Promise<void> {
  await sendEmail({
    to: params.order.email,
    subject: params.isPartial ? `Part of order ${params.order.number} has shipped` : `Order ${params.order.number} has shipped`,
    react: ShippingNoticeEmail({
      orderNumber: params.order.number,
      trackingNumber: params.trackingNumber,
      carrier: params.carrier ?? undefined,
      items: params.shippedItems.map((item) => ({ title: item.titleSnapshot, quantity: item.quantity })),
      isPartial: params.isPartial,
      orderUrl: `${siteUrl}/orders/${params.order.id}`,
    }),
    logContext: { orderId: params.order.id, kind: "shipping_notice" },
  });
}

export async function sendRefundNoticeEmail(params: {
  order: OrderForEmail;
  amount: number;
  isFullRefund: boolean;
  reason?: string | null;
}): Promise<void> {
  await sendEmail({
    to: params.order.email,
    subject: `${params.isFullRefund ? "Refund" : "Partial refund"} issued for order ${params.order.number}`,
    react: RefundNoticeEmail({
      orderNumber: params.order.number,
      amountFormatted: formatMoney({ amount: params.amount, currency: params.order.currency }),
      isFullRefund: params.isFullRefund,
      reason: params.reason ?? undefined,
      orderUrl: `${siteUrl}/orders/${params.order.id}`,
    }),
    logContext: { orderId: params.order.id, kind: "refund_notice" },
  });
}
