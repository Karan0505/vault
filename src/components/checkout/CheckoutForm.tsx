"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Elements } from "@stripe/react-stripe-js";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, ShieldCheck, Check } from "lucide-react";
import { getStripeClient } from "@/lib/payments/stripe-client";
import { PaymentStep } from "./PaymentStep";
import { notifyCartUpdated } from "@/lib/cart/cart-events";

interface CheckoutResult {
  orderId: string;
  clientSecret: string;
}

export function CheckoutForm({ initialDiscountCode }: { initialDiscountCode?: string }) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [apartment, setApartment] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("CA");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("United States");

  const [session, setSession] = useState<CheckoutResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data?.user?.email && !email) {
            setEmail(data.user.email);
          }
          if (data?.user?.name && !fullName) {
            setFullName(data.user.name);
          }
        }
      } catch {
        // ignore
      }
    }
    loadUser();
  }, [email, fullName]);

  async function handleStartPayment(e: React.FormEvent) {
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
        if (res.status === 401) {
          router.push(`/login?redirect=${encodeURIComponent("/checkout")}`);
          return;
        }

        if (typeof body.available === "number") {
          setError(
            `Only ${body.available} left of one item in your cart — update quantity and try again.`
          );
        } else {
          setError(typeof body.error === "string" ? body.error : "Couldn't start checkout.");
        }
        setIsSubmitting(false);
        return;
      }

      setSession(body);
      setCurrentStep(3);
      notifyCartUpdated();
    } catch {
      setError("Something went wrong — try again.");
      setIsSubmitting(false);
    }
  }

  const STEPS = [
    { num: 1, label: "Information" },
    { num: 2, label: "Shipping" },
    { num: 3, label: "Payment" },
    { num: 4, label: "Review" },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* 4-Step Progress Indicator */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-4 text-xs font-medium">
        {STEPS.map((s, idx) => {
          const isActive = currentStep === s.num;
          const isDone = currentStep > s.num;
          return (
            <div key={s.num} className="flex items-center gap-1.5">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  isActive
                    ? "bg-black text-white"
                    : isDone
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {isDone ? <Check size={10} strokeWidth={3} /> : s.num}
              </span>
              <span className={isActive ? "font-bold text-gray-900" : isDone ? "text-gray-700" : "text-gray-400"}>
                {s.label}
              </span>
              {idx < STEPS.length - 1 && <span className="ml-2 text-gray-300">/</span>}
            </div>
          );
        })}
      </div>

      {currentStep < 3 && (
        <form onSubmit={(e) => { e.preventDefault(); setCurrentStep(2); }} className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <h3 className="font-sans text-base font-bold text-gray-900">
              {currentStep === 1 ? "1. Shipping & Contact Information" : "2. Shipping Method"}
            </h3>

            {currentStep === 1 ? (
              <div className="grid gap-3.5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-gray-700">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50/70 px-3.5 py-2.5 text-xs text-gray-900 focus:border-black focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-gray-700">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@example.com"
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50/70 px-3.5 py-2.5 text-xs text-gray-900 focus:border-black focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-gray-700">Address</label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="123 Main Street"
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50/70 px-3.5 py-2.5 text-xs text-gray-900 focus:border-black focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-gray-700">Apartment, suite, etc. (optional)</label>
                  <input
                    type="text"
                    value={apartment}
                    onChange={(e) => setApartment(e.target.value)}
                    placeholder="Apt 4B"
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50/70 px-3.5 py-2.5 text-xs text-gray-900 focus:border-black focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700">City</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="San Francisco"
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50/70 px-3.5 py-2.5 text-xs text-gray-900 focus:border-black focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-gray-700">State</label>
                    <input
                      type="text"
                      required
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="CA"
                      className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50/70 px-3.5 py-2.5 text-xs text-gray-900 focus:border-black focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700">ZIP Code</label>
                    <input
                      type="text"
                      required
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                      placeholder="94103"
                      className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50/70 px-3.5 py-2.5 text-xs text-gray-900 focus:border-black focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-gray-700">Country</label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50/70 px-3.5 py-2.5 text-xs text-gray-900 focus:border-black focus:bg-white focus:outline-none"
                  >
                    <option value="United States">United States</option>
                    <option value="Canada">Canada</option>
                    <option value="United Kingdom">United Kingdom</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-200 p-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <input type="radio" defaultChecked name="shipping" className="text-black" />
                    <div>
                      <p className="text-xs font-bold text-gray-900">Standard Shipping (3-5 business days)</p>
                      <p className="text-[11px] text-gray-500">Delivered via UPS Ground</p>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-emerald-700">FREE</span>
                </label>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            {currentStep === 2 && (
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-xs font-medium text-gray-600 hover:text-black"
              >
                ← Return to Information
              </button>
            )}

            {currentStep === 1 ? (
              <button
                type="button"
                onClick={() => {
                  if (!email || !fullName) {
                    setError("Please enter your name and email.");
                    return;
                  }
                  setError(null);
                  setCurrentStep(2);
                }}
                className="ml-auto inline-flex items-center rounded-full bg-black px-7 py-3 text-xs font-semibold text-white shadow-sm hover:bg-neutral-800"
              >
                Continue to Shipping
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartPayment}
                disabled={isSubmitting}
                className="ml-auto inline-flex items-center rounded-full bg-black px-7 py-3 text-xs font-semibold text-white shadow-sm hover:bg-neutral-800 disabled:opacity-50"
              >
                {isSubmitting ? "Reserving Items…" : "Continue to Payment"}
              </button>
            )}
          </div>
        </form>
      )}

      {currentStep === 3 && session && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <ShieldCheck size={16} className="text-emerald-600" />
            <span>All transactions are secure and encrypted.</span>
          </div>

          <Elements
            stripe={getStripeClient()}
            options={{ clientSecret: session.clientSecret, appearance: { theme: "stripe" } }}
          >
            <PaymentStep orderId={session.orderId} />
          </Elements>
        </motion.div>
      )}

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs text-rose-600 font-medium"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

