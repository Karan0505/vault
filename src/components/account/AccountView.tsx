"use client";

import { useState } from "react";
import Link from "next/link";
import { User, MapPin, CreditCard, Heart, Settings } from "lucide-react";
import { formatMoney } from "@/lib/payments/money";
import { AddressManager, type AddressItem } from "@/lib/../components/account/AddressManager";

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
  const [activeTab, setActiveTab] = useState<"overview" | "addresses" | "payments" | "wishlist" | "settings">("overview");

  const statusToneMap: Record<string, string> = {
    delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
    fulfilled: "bg-blue-50 text-blue-700 border-blue-200",
    paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    cancelled: "bg-gray-100 text-gray-700 border-gray-200",
    refunded: "bg-rose-50 text-rose-700 border-rose-200",
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
              ? "bg-gray-100 text-black"
              : "text-gray-600 hover:bg-gray-50 hover:text-black"
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
              ? "bg-gray-100 text-black"
              : "text-gray-600 hover:bg-gray-50 hover:text-black"
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
              ? "bg-gray-100 text-black"
              : "text-gray-600 hover:bg-gray-50 hover:text-black"
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
              ? "bg-gray-100 text-black"
              : "text-gray-600 hover:bg-gray-50 hover:text-black"
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
              ? "bg-gray-100 text-black"
              : "text-gray-600 hover:bg-gray-50 hover:text-black"
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
            <div id="orders" className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-xs scroll-mt-24">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-gray-900">
                  Recent Orders
                </h2>
                <span className="text-xs text-gray-500 font-medium font-mono">
                  {orders.length} {orders.length === 1 ? "order" : "orders"} placed
                </span>
              </div>

              <div className="mt-2 divide-y divide-gray-100">
                {orders.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-xs font-semibold text-gray-700">No orders found</p>
                    <p className="mt-1 text-xs text-gray-400">Your placed orders will appear here.</p>
                    <Link
                      href="/search"
                      className="mt-4 inline-flex items-center rounded-full bg-black px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-gray-800"
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
                        <span className="font-mono font-bold text-gray-900">
                          #{order.number}
                        </span>
                        <span className="text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="font-mono font-bold text-gray-900">
                          {formatMoney({ amount: order.totalAmount, currency: order.currency })}
                        </span>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${
                            statusToneMap[order.status] ?? "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {order.status}
                        </span>
                        <Link
                          href={`/orders/${order.id}`}
                          className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 font-semibold text-gray-800 hover:bg-gray-50 hover:border-gray-300 transition-colors"
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
            <div id="addresses" className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-xs scroll-mt-24">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-gray-900">
                  Customer Profile
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveTab("addresses")}
                  className="text-xs font-semibold text-gray-700 hover:text-black underline underline-offset-2"
                >
                  Manage Addresses →
                </button>
              </div>
              <div className="mt-4 text-xs text-gray-600 space-y-1.5">
                <p className="font-bold text-gray-900">{userProfile.name || "Customer"}</p>
                <p className="font-mono text-gray-500">{userProfile.email}</p>
                <p className="text-[11px] text-gray-400">
                  Member since {new Date(userProfile.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </>
        )}

        {activeTab === "addresses" && (
          <div className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-xs">
            <AddressManager initialAddresses={initialAddresses} />
          </div>
        )}

        {activeTab === "payments" && (
          <div className="rounded-3xl border border-gray-200/80 bg-white p-8 text-center shadow-xs">
            <CreditCard size={28} className="mx-auto text-gray-400" />
            <h3 className="mt-3 text-sm font-bold text-gray-900">Payment Methods</h3>
            <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
              Saved payment methods are managed securely during checkout via Stripe.
            </p>
          </div>
        )}

        {activeTab === "wishlist" && (
          <div className="rounded-3xl border border-gray-200/80 bg-white p-8 text-center shadow-xs">
            <Heart size={28} className="mx-auto text-gray-400" />
            <h3 className="mt-3 text-sm font-bold text-gray-900">Wishlist</h3>
            <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
              Your saved items will appear here.
            </p>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="rounded-3xl border border-gray-200/80 bg-white p-8 text-center shadow-xs">
            <Settings size={28} className="mx-auto text-gray-400" />
            <h3 className="mt-3 text-sm font-bold text-gray-900">Account Settings</h3>
            <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
              Preferences and password settings.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
