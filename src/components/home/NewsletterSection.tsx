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
    <section className="rounded-3xl border border-gray-200/80 dark:border-ink-800 bg-gray-50/70 dark:bg-ink-900/60 p-8 sm:p-10 shadow-2xs">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
        {/* Left icon & text */}
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xs">
            <Mail size={22} />
          </div>
          <div>
            <h3 className="font-sans text-lg font-bold text-gray-950 dark:text-white sm:text-xl">
              Stay in the loop
            </h3>
            <p className="mt-0.5 font-sans text-xs text-gray-600 dark:text-gray-400">
              Get exclusive offers, new arrivals, and style tips straight to your inbox.
            </p>
          </div>
        </div>

        {/* Right form */}
        <div className="flex flex-col gap-2">
          {subscribed ? (
            <div className="flex items-center gap-2 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-5 py-3 text-xs font-semibold text-emerald-800 dark:text-emerald-400">
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
                className="w-full sm:w-72 rounded-full border border-gray-300 dark:border-ink-700 bg-white dark:bg-ink-900 px-4 py-2.5 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-black dark:focus:border-white focus:outline-none shadow-2xs"
              />
              <button
                type="submit"
                className="shrink-0 rounded-full bg-black dark:bg-white px-6 py-2.5 text-xs font-semibold text-white dark:text-black shadow-sm transition-all hover:bg-neutral-800 dark:hover:bg-gray-200 active:scale-[0.98] cursor-pointer"
              >
                Subscribe
              </button>
            </form>
          )}

          <p className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 font-sans">
            <Check size={12} className="text-gray-600 dark:text-gray-400" />
            <span>No spam, unsubscribe anytime.</span>
          </p>
        </div>
      </div>
    </section>
  );
}
