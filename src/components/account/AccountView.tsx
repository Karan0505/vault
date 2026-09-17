"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { User, MapPin, CreditCard, Heart, Settings } from "lucide-react";
import { formatMoney } from "@/lib/payments/money";
import { AddressManager, type AddressItem } from "@/lib/../components/account/AddressManager";
import { WishlistView } from "@/components/wishlist/WishlistView";

interface OrderItemSummary {
  id: string;
  number: string;
  status: string;
  totalAmount: number;
  currency: string;
  createdAt: string | Date;
}

interface AccountViewProps {
  userProfile: {
    name: string | null;
    email: string | null;
    createdAt: string | Date;
  };
  orders: OrderItemSummary[];
  initialAddresses: AddressItem[];
}

export function AccountView({ userProfile, orders, initialAddresses }: AccountViewProps) {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab") as "overview" | "addresses" | "payments" | "wishlist" | "settings" | null;
  const [activeTab, setActiveTab] = useState<"overview" | "addresses" | "payments" | "wishlist" | "settings">(
    requestedTab && ["overview", "addresses", "payments", "wishlist", "settings"].includes(requestedTab)
      ? requestedTab
      : "overview"
  );

  useEffect(() => {
    if (requestedTab && ["overview", "addresses", "payments", "wishlist", "settings"].includes(requestedTab)) {
      setActiveTab(requestedTab);
    }
  }, [requestedTab]);

  const statusToneMap: Record<string, string> = {
    delivered: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    fulfilled: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    paid: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    pending: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    cancelled: "bg-gray-100 dark:bg-ink-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-ink-700",
    refunded: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  };

  const statusLabelMap: Record<string, string> = {
    delivered: "Delivered",
    fulfilled: "Shipped",
    paid: "Paid",
    pending: "Pending",
    cancelled: "Cancelled",
    refunded: "Refunded",
  };

  return (
    <div className="mt-8 grid gap-8 md:grid-cols-[220px_1fr]">
      {/* Left Sidebar Navigation */}
      <aside className="flex flex-col gap-1 text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 font-bold text-left transition-colors ${
            activeTab === "overview"
              ? "bg-gray-100 dark:bg-ink-800 text-black dark:text-white"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-ink-900 hover:text-black dark:hover:text-white"
          }`}
        >
          <User size={15} />
          <span>Overview</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("addresses")}
          className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 font-bold text-left transition-colors ${
            activeTab === "addresses"
              ? "bg-gray-100 dark:bg-ink-800 text-black dark:text-white"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-ink-900 hover:text-black dark:hover:text-white"
          }`}
        >
          <MapPin size={15} />
          <span>Addresses</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("payments")}
          className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 font-bold text-left transition-colors ${
            activeTab === "payments"
              ? "bg-gray-100 dark:bg-ink-800 text-black dark:text-white"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-ink-900 hover:text-black dark:hover:text-white"
          }`}
        >
          <CreditCard size={15} />
          <span>Payment Methods</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("wishlist")}
          className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 font-bold text-left transition-colors ${
            activeTab === "wishlist"
              ? "bg-gray-100 dark:bg-ink-800 text-black dark:text-white"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-ink-900 hover:text-black dark:hover:text-white"
          }`}
        >
          <Heart size={15} />
          <span>Wishlist</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 font-bold text-left transition-colors ${
            activeTab === "settings"
              ? "bg-gray-100 dark:bg-ink-800 text-black dark:text-white"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-ink-900 hover:text-black dark:hover:text-white"
          }`}
        >
          <Settings size={15} />
          <span>Account Settings</span>
        </button>
      </aside>

      {/* Right Main Content */}
      <div className="flex flex-col gap-8">
        {activeTab === "overview" && (
          <>
            {/* Recent Orders Section */}
            <div id="orders" className="rounded-3xl border border-gray-200/80 dark:border-ink-800 bg-white dark:bg-ink-900 p-6 shadow-xs scroll-mt-24">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-ink-800 pb-4">
                <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                  Recent Orders
                </h2>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium font-mono">
                  {orders.length} {orders.length === 1 ? "order" : "orders"} placed
                </span>
              </div>

              <div className="mt-2 divide-y divide-gray-100 dark:divide-ink-800">
                {orders.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">No orders found</p>
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Your placed orders will appear here.</p>
                    <Link
                      href="/search"
                      className="mt-4 inline-flex items-center rounded-full bg-black dark:bg-white px-4 py-2 text-xs font-semibold text-white dark:text-black shadow-xs hover:bg-gray-800 dark:hover:bg-gray-200"
                    >
                      Start shopping
                    </Link>
                  </div>
                ) : (
                  orders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between py-4 text-xs"
                    >
                      <div className="flex items-center gap-4">
                        <span className="font-mono font-bold text-gray-900 dark:text-white">
                          #{order.number}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          {new Date(order.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="font-mono font-bold text-gray-900 dark:text-white">
                          {formatMoney({ amount: order.totalAmount, currency: order.currency })}
                        </span>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${
                            statusToneMap[order.status] ?? "bg-gray-100 dark:bg-ink-800 text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {statusLabelMap[order.status] ?? order.status}
                        </span>
                        <Link
                          href={`/orders/${order.id}`}
                          className="rounded-lg border border-gray-200 dark:border-ink-700 bg-white dark:bg-ink-800 px-2.5 py-1 font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-ink-700 hover:border-gray-300 dark:hover:border-ink-600 transition-colors"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Profile & Addresses Summary Card */}
            <div id="addresses" className="rounded-3xl border border-gray-200/80 dark:border-ink-800 bg-white dark:bg-ink-900 p-6 shadow-xs scroll-mt-24">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-ink-800 pb-4">
                <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                  Customer Profile
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveTab("addresses")}
                  className="text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white underline underline-offset-2"
                >
                  Manage Addresses →
                </button>
              </div>
              <div className="mt-4 text-xs text-gray-600 dark:text-gray-400 space-y-1.5">
                <p className="font-bold text-gray-900 dark:text-white">{userProfile.name || "Customer"}</p>
                <p className="font-mono text-gray-500 dark:text-gray-400">{userProfile.email}</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">
                  Member since {new Date(userProfile.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </>
        )}

        {activeTab === "addresses" && (
          <div className="rounded-3xl border border-gray-200/80 dark:border-ink-800 bg-white dark:bg-ink-900 p-6 shadow-xs">
            <AddressManager initialAddresses={initialAddresses} />
          </div>
        )}

        {activeTab === "payments" && (
          <div className="rounded-3xl border border-gray-200/80 dark:border-ink-800 bg-white dark:bg-ink-900 p-8 text-center shadow-xs">
            <CreditCard size={28} className="mx-auto text-gray-400 dark:text-gray-500" />
            <h3 className="mt-3 text-sm font-bold text-gray-900 dark:text-white">Payment Methods</h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              Saved payment methods are managed securely during checkout via Stripe.
            </p>
          </div>
        )}

        {activeTab === "wishlist" && (
          <div>
            <div className="mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                Your Saved Wishlist
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Items you have saved across the store
              </p>
            </div>
            <WishlistView />
          </div>
        )}

        {activeTab === "settings" && (
          <div className="rounded-3xl border border-gray-200/80 dark:border-ink-800 bg-white dark:bg-ink-900 p-8 text-center shadow-xs">
            <Settings size={28} className="mx-auto text-gray-400 dark:text-gray-500" />
            <h3 className="mt-3 text-sm font-bold text-gray-900 dark:text-white">Account Settings</h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              Preferences and password settings.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
