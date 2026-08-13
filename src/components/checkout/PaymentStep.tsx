"use client";

import { useState } from "react";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/Button";

export function PaymentStep({ orderId }: { orderId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsSubmitting(true);
    setError(null);

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success?order_id=${orderId}`,
      },
    });

    // confirmPayment only returns if it fails synchronously (e.g. a
    // validation error) — on success the browser navigates to
    // return_url and this component unmounts before getting here. That
    // redirect is a UX convenience only: the order is already marked
    // paid by the webhook independent of whether this redirect ever
    // completes, which is exactly the "webhook before browser redirect"
    // case the brief calls out.
    if (confirmError) {
      setError(confirmError.message ?? "Payment failed — check your details and try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <PaymentElement />
      {error && <p className="text-sm text-signal-red">{error}</p>}
      <Button type="submit" size="lg" disabled={!stripe || isSubmitting}>
        {isSubmitting ? "Processing…" : "Pay now"}
      </Button>
      <p className="text-center text-xs text-ink-600">
        Test mode — use card 4242 4242 4242 4242, any future expiry, any CVC.
      </p>
    </form>
  );
}
