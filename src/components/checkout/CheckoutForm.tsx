"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Elements } from "@stripe/react-stripe-js";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Check } from "lucide-react";
import { getStripeClient } from "@/lib/payments/stripe-client";
import { PaymentStep } from "./PaymentStep";
import { SavedAddressSelector } from "./SavedAddressSelector";
import type { AddressItem } from "@/components/account/AddressManager";
import { notifyCartUpdated } from "@/lib/cart/cart-events";

interface CheckoutResult {
  orderId: string;
  clientSecret: string;
}

export function CheckoutForm({ initialDiscountCode }: { initialDiscountCode?: string }) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [savedAddressesCount, setSavedAddressesCount] = useState<number | null>(null);
  const hasUserExplicitlySelectedRef = useRef<boolean>(false);

  // Canonical checkout attempt identity per session/attempt
  const [checkoutAttemptId] = useState<string>(() =>
    Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36)
  );

  // Contact Information (Cleanly separated from delivery address selection)
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

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

  // Address Selection Handler (User explicitly clicked a radio card)
  const handleSelectSavedAddress = (addr: AddressItem) => {
    hasUserExplicitlySelectedRef.current = true;
    setSelectedAddressId(addr.id);
    setError(null);
  };

  // Reconcile selectedAddressId against fresh address list from backend
  const handleAddressListLoaded = useCallback((list: AddressItem[]) => {
    setSavedAddressesCount(list.length);

    if (list.length === 0) {
      setSelectedAddressId(null);
      hasUserExplicitlySelectedRef.current = false;
      return;
    }

    // Rule A: If selectedAddressId exists in the fresh list, preserve it
    setSelectedAddressId((currentId) => {
      if (currentId) {
        const exists = list.some((a) => a.id === currentId);
        if (exists) {
          return currentId;
        }
        // Rule B: If previously selected address was deleted/missing, clear it
        return null;
      }

      // Rule D: Initial load preselection (only if no explicit selection has occurred)
      if (!hasUserExplicitlySelectedRef.current) {
        const defaultAddr = list.find((a) => a.isDefault);
        return defaultAddr ? defaultAddr.id : list[0]?.id || null;
      }

      return null;
    });
  }, []);

  async function handleStartPayment(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;

    if (!selectedAddressId) {
      if (savedAddressesCount === 0) {
        setError("No delivery address saved yet. Please add an address to continue.");
      } else {
        setError("Please select a delivery address to continue.");
      }
      return;
    }

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        email,
        discountCode: initialDiscountCode || undefined,
        selectedAddressId,
        checkoutAttemptId,
      };

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
      setCurrentStep(2);
      notifyCartUpdated();
    } catch {
      setError("Something went wrong — try again.");
      setIsSubmitting(false);
    }
  }

  const STEPS = [
    { num: 1, label: "Information" },
    { num: 2, label: "Payment" },
    { num: 3, label: "Review" },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* 3-Step Progress Indicator */}
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

      {currentStep === 1 && (
        <form onSubmit={handleStartPayment} className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <h3 className="font-sans text-base font-bold text-gray-900">
              1. Delivery & Contact Information
            </h3>

            <div className="space-y-6">
              {/* Contact Information */}
              <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3 text-xs">
                <h4 className="font-bold uppercase tracking-wider text-gray-900">
                  Contact Information
                </h4>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
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

                  <div>
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
                    <label className="text-xs font-semibold text-gray-700">Phone Number (Optional)</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50/70 px-3.5 py-2.5 text-xs text-gray-900 focus:border-black focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Saved Address Selector (Clean Radio Cards or 0-Address Empty State) */}
              <SavedAddressSelector
                selectedAddressId={selectedAddressId}
                onSelectAddress={handleSelectSavedAddress}
                onAddressListLoaded={handleAddressListLoaded}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="submit"
              disabled={isSubmitting || savedAddressesCount === 0 || !selectedAddressId}
              className="ml-auto inline-flex items-center rounded-full bg-black px-7 py-3 text-xs font-semibold text-white shadow-sm hover:bg-neutral-800 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? "Reserving Items…" : "Continue to Payment"}
            </button>
          </div>
        </form>
      )}

      {currentStep === 2 && session && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <ShieldCheck size={16} className="text-emerald-600" />
              <span>All transactions are secure and encrypted.</span>
            </div>
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="text-xs font-medium text-gray-600 hover:text-black"
            >
              ← Edit Information
            </button>
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
