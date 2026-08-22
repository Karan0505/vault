"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Settings,
  CreditCard,
  Package,
  Bell,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Globe,
  Sliders,
  ShieldCheck,
} from "lucide-react";
import type { StoreSettings } from "@/lib/settings/settings.server";
import type { StripeStatusInfo } from "@/lib/integrations/stripe-status.server";

interface SettingsClientProps {
  initialSettings: StoreSettings;
  stripeStatus: StripeStatusInfo;
}

export function SettingsClient({ initialSettings, stripeStatus }: SettingsClientProps) {
  const router = useRouter();
  const [settings, setSettings] = useState<StoreSettings>(initialSettings);
  const [freeShippingDollars, setFreeShippingDollars] = useState(
    (initialSettings.freeShippingThreshold / 100).toFixed(2)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const freeShippingMinor = Math.round(parseFloat(freeShippingDollars || "0") * 100);

      const payload: StoreSettings = {
        ...settings,
        freeShippingThreshold: isNaN(freeShippingMinor) ? 0 : freeShippingMinor,
      };

      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save settings");
      }

      setActionSuccess("Store and platform settings saved successfully!");
      router.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStripeBadgeColor = (status: string) => {
    if (status.includes("Live")) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    if (status.includes("Test")) return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
    if (status.includes("Not Configured")) return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    return "bg-rose-500/10 text-rose-400 border-rose-500/20";
  };

  return (
    <div className="flex flex-col gap-8 text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-sans text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Store & Platform Settings
          </h1>
          <p className="mt-1 font-mono text-xs text-slate-400">
            Global store configuration, gateway connectivity, and inventory policy controls
          </p>
        </div>
      </div>

      {/* Feedback Messages */}
      {actionSuccess && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 font-sans text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 font-sans text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{actionError}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="flex flex-col gap-8">
        {/* Section 1: Store Profile */}
        <div className="rounded-2xl border border-[#1E293B] bg-[#111827] p-6 shadow-panel">
          <div className="flex items-center gap-3 border-b border-[#1E293B] pb-4 mb-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1E293B] text-indigo-400">
              <Globe size={18} />
            </div>
            <div>
              <h3 className="font-sans text-sm font-bold text-white">Store Identity & Currency</h3>
              <p className="font-mono text-xs text-slate-400">Public profile and operational parameters</p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="block font-sans text-xs font-semibold text-slate-300 mb-1">
                Store Name
              </label>
              <input
                type="text"
                required
                value={settings.storeName}
                onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                className="w-full rounded-xl border border-[#1E293B] bg-[#0B0F19] px-3.5 py-2 font-sans text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-sans text-xs font-semibold text-slate-300 mb-1">
                Contact & Support Email
              </label>
              <input
                type="email"
                required
                value={settings.contactEmail}
                onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                className="w-full rounded-xl border border-[#1E293B] bg-[#0B0F19] px-3.5 py-2 font-sans text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-sans text-xs font-semibold text-slate-300 mb-1">
                Store Base Currency
              </label>
              <select
                value={settings.currency}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value as any })}
                className="w-full rounded-xl border border-[#1E293B] bg-[#0B0F19] px-3.5 py-2 font-sans text-xs text-white focus:border-indigo-500 focus:outline-hidden"
              >
                <option value="USD">USD ($) — United States Dollar</option>
                <option value="EUR">EUR (€) — Euro</option>
                <option value="GBP">GBP (£) — British Pound</option>
                <option value="CAD">CAD ($) — Canadian Dollar</option>
                <option value="INR">INR (₹) — Indian Rupee</option>
                <option value="AUD">AUD ($) — Australian Dollar</option>
              </select>
            </div>

            <div>
              <label className="block font-sans text-xs font-semibold text-slate-300 mb-1">
                Default Timezone
              </label>
              <input
                type="text"
                value={settings.timezone}
                onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                className="w-full rounded-xl border border-[#1E293B] bg-[#0B0F19] px-3.5 py-2 font-sans text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Payment Gateway Status */}
        <div className="rounded-2xl border border-[#1E293B] bg-[#111827] p-6 shadow-panel">
          <div className="flex items-center gap-3 border-b border-[#1E293B] pb-4 mb-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1E293B] text-emerald-400">
              <CreditCard size={18} />
            </div>
            <div>
              <h3 className="font-sans text-sm font-bold text-white">Payment Gateway & Stripe Connectivity</h3>
              <p className="font-mono text-xs text-slate-400">Server-verified live gateway state</p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="rounded-xl border border-[#1E293B] bg-[#0B0F19] p-4 flex flex-col justify-between">
              <div>
                <p className="font-sans text-xs font-semibold text-slate-400">Live Connection Health</p>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`rounded-lg border px-3 py-1 font-mono text-xs font-bold ${getStripeBadgeColor(
                      stripeStatus.status
                    )}`}
                  >
                    {stripeStatus.status}
                  </span>
                </div>
              </div>
              <p className="font-mono text-[11px] text-slate-500 mt-3">
                Zero secret credentials exposed to client. Server ping verified.
              </p>
            </div>

            <div className="rounded-xl border border-[#1E293B] bg-[#0B0F19] p-4 flex flex-col justify-between">
              <div>
                <p className="font-sans text-xs font-semibold text-slate-400">Webhook Processing Health</p>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`rounded-lg border px-3 py-1 font-mono text-xs font-bold ${
                      stripeStatus.webhookConfigured
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}
                  >
                    {stripeStatus.webhookConfigured ? "Webhook Configured" : "Webhook Secret Missing"}
                  </span>
                </div>
              </div>
              <p className="font-mono text-[11px] text-slate-500 mt-3">
                Endpoint: <code>/api/webhooks/stripe</code>
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Inventory & Checkout Policies */}
        <div className="rounded-2xl border border-[#1E293B] bg-[#111827] p-6 shadow-panel">
          <div className="flex items-center gap-3 border-b border-[#1E293B] pb-4 mb-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1E293B] text-amber-400">
              <Sliders size={18} />
            </div>
            <div>
              <h3 className="font-sans text-sm font-bold text-white">Inventory Rules & Shipping Thresholds</h3>
              <p className="font-mono text-xs text-slate-400">Stock alerting thresholds and cart rules</p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <label className="block font-sans text-xs font-semibold text-slate-300 mb-1">
                Low Stock Alert Threshold (Units)
              </label>
              <input
                type="number"
                min={1}
                max={1000}
                required
                value={settings.lowStockThreshold}
                onChange={(e) =>
                  setSettings({ ...settings, lowStockThreshold: parseInt(e.target.value, 10) || 10 })
                }
                className="w-full rounded-xl border border-[#1E293B] bg-[#0B0F19] px-3.5 py-2 font-mono text-xs text-white focus:border-indigo-500 focus:outline-hidden"
              />
              <p className="font-sans text-[11px] text-slate-500 mt-1">
                Items with stock at or below this count show as Low Stock.
              </p>
            </div>

            <div>
              <label className="block font-sans text-xs font-semibold text-slate-300 mb-1">
                Reservation Hold TTL (Minutes)
              </label>
              <input
                type="number"
                min={1}
                max={120}
                required
                value={settings.reservationTTL}
                onChange={(e) =>
                  setSettings({ ...settings, reservationTTL: parseInt(e.target.value, 10) || 10 })
                }
                className="w-full rounded-xl border border-[#1E293B] bg-[#0B0F19] px-3.5 py-2 font-mono text-xs text-white focus:border-indigo-500 focus:outline-hidden"
              />
              <p className="font-sans text-[11px] text-slate-500 mt-1">
                Minutes inventory is reserved during customer checkout.
              </p>
            </div>

            <div>
              <label className="block font-sans text-xs font-semibold text-slate-300 mb-1">
                Free Shipping Threshold ($)
              </label>
              <input
                type="number"
                step="0.01"
                min={0}
                required
                value={freeShippingDollars}
                onChange={(e) => setFreeShippingDollars(e.target.value)}
                className="w-full rounded-xl border border-[#1E293B] bg-[#0B0F19] px-3.5 py-2 font-mono text-xs text-white focus:border-indigo-500 focus:outline-hidden"
              />
              <p className="font-sans text-[11px] text-slate-500 mt-1">
                Orders equal or exceeding this total qualify for free shipping.
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: Automated Email Notifications */}
        <div className="rounded-2xl border border-[#1E293B] bg-[#111827] p-6 shadow-panel">
          <div className="flex items-center gap-3 border-b border-[#1E293B] pb-4 mb-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1E293B] text-indigo-400">
              <Bell size={18} />
            </div>
            <div>
              <h3 className="font-sans text-sm font-bold text-white">Automated Customer Notifications</h3>
              <p className="font-mono text-xs text-slate-400">Transactional email notifications dispatch</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <label className="flex items-center justify-between rounded-xl border border-[#1E293B] bg-[#0B0F19] p-4 cursor-pointer">
              <div>
                <p className="font-sans text-xs font-bold text-white">Order Confirmation Emails</p>
                <p className="font-sans text-[11px] text-slate-400 mt-0.5">
                  Automatically send itemized receipts upon successful payment.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.orderConfirmationEmails}
                onChange={(e) =>
                  setSettings({ ...settings, orderConfirmationEmails: e.target.checked })
                }
                className="h-4 w-4 accent-indigo-600 rounded-sm"
              />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-[#1E293B] bg-[#0B0F19] p-4 cursor-pointer">
              <div>
                <p className="font-sans text-xs font-bold text-white">Refund Notice Emails</p>
                <p className="font-sans text-[11px] text-slate-400 mt-0.5">
                  Notify customers when an itemized or goodwill refund is executed.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.refundEmails}
                onChange={(e) => setSettings({ ...settings, refundEmails: e.target.checked })}
                className="h-4 w-4 accent-indigo-600 rounded-sm"
              />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-[#1E293B] bg-[#0B0F19] p-4 cursor-pointer">
              <div>
                <p className="font-sans text-xs font-bold text-white">Fulfillment & Tracking Emails</p>
                <p className="font-sans text-[11px] text-slate-400 mt-0.5">
                  Send tracking number and carrier details when orders ship.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.fulfillmentEmails}
                onChange={(e) =>
                  setSettings({ ...settings, fulfillmentEmails: e.target.checked })
                }
                className="h-4 w-4 accent-indigo-600 rounded-sm"
              />
            </label>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-end gap-4 border-t border-[#1E293B] pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 font-sans text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>Save All Changes</span>
          </button>
        </div>
      </form>
    </div>
  );
}
