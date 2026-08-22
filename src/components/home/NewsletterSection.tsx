"use client";

import { useState } from "react";
import { Mail, Check } from "lucide-react";

export function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
    }
  }

  return (
    <section className="rounded-3xl border border-gray-200/80 bg-gray-50/70 p-8 sm:p-10 shadow-2xs">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
        {/* Left icon & text */}
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xs">
            <Mail size={22} />
          </div>
          <div>
            <h3 className="font-sans text-lg font-bold text-gray-950 sm:text-xl">
              Stay in the loop
            </h3>
            <p className="mt-0.5 font-sans text-xs text-gray-600">
              Get exclusive offers, new arrivals, and style tips straight to your inbox.
            </p>
          </div>
        </div>

        {/* Right form */}
        <div className="flex flex-col gap-2">
          {subscribed ? (
            <div className="flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-5 py-3 text-xs font-semibold text-emerald-800">
              <Check size={16} />
              <span>Thank you for subscribing! Check your inbox soon.</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="w-full sm:w-72 rounded-full border border-gray-300 bg-white px-4 py-2.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-black focus:outline-none shadow-2xs"
              />
              <button
                type="submit"
                className="shrink-0 rounded-full bg-black px-6 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-neutral-800 active:scale-[0.98] cursor-pointer"
              >
                Subscribe
              </button>
            </form>
          )}

          <p className="flex items-center gap-1 text-[11px] text-gray-500 font-sans">
            <Check size={12} className="text-gray-600" />
            <span>No spam, unsubscribe anytime.</span>
          </p>
        </div>
      </div>
    </section>
  );
}
