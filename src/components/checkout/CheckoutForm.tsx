"use client";

import { useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { motion, AnimatePresence } from "framer-motion";
import { getStripeClient } from "@/lib/stripe-client";
import { PaymentStep } from "./PaymentStep";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface CheckoutResult {
  orderId: string;
  clientSecret: string;
}


export function CheckoutForm({ initialDiscountCode }: { initialDiscountCode?: string }) {
  const [email, setEmail] = useState("");
  const [session, setSession] = useState<CheckoutResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, discountCode: initialDiscountCode || undefined }),
      });

      const body = await res.json();

      if (!res.ok) {
        if (typeof body.available === "number") {
          setError(
            `Only ${body.available} left of one item in your cart — update the quantity in your cart and try again.`
          );
        } else {
          setError(typeof body.error === "string" ? body.error : "Couldn't start checkout.");
        }
        setIsSubmitting(false);
        return;
      }

      setSession(body);
    } catch {
      setError("Something went wrong — try again.");
      setIsSubmitting(false);
    }
  }

  if (session) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Elements stripe={getStripeClient()} options={{ clientSecret: session.clientSecret, appearance: { theme: "night" } }}>
          <PaymentStep orderId={session.orderId} />
        </Elements>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Input
        type="email"
        label="Email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        hint="Your order confirmation goes here."
      />
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-sm text-signal-red"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? "Reserving your items…" : "Continue to payment"}
      </Button>
    </form>
  );
}
