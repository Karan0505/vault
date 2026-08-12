import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { processStripeEvent } from "@/lib/webhooks.server";

// Stripe signs the raw request body — Next's App Router does not parse
// the body for us by default, so request.text() below gives us exactly
// the bytes Stripe signed. Do not add a body parser in front of this route.
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 });
  }

  const rawBody = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid signature";
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 });
  }

  const outcome = await processStripeEvent(event);
  return NextResponse.json({ received: true, outcome });
}
