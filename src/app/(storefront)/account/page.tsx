import Link from "next/link";
import type { Metadata } from "next";
import { User, MapPin, CreditCard, Heart, Settings } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { formatMoney } from "@/lib/payments/money";
import { requireCustomer } from "@/lib/auth/rbac";

export const metadata: Metadata = { title: "My Account" };

export default async function AccountPage() {
  // Server-side RBAC Guard: Requires authenticated CUSTOMER
  const { session } = await requireCustomer({ redirectTo: "/account" });

  // STRICT Customer Data Isolation: Query strictly scoped by session.user.id
  const [orders, userProfile] = await Promise.all([
    prisma.order.findMany({
      where: { userId: session.user.id },
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { items: true },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, createdAt: true },
    }),
  ]);

  const statusToneMap: Record<string, string> = {
    delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
    fulfilled: "bg-blue-50 text-blue-700 border-blue-200",
    paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    cancelled: "bg-gray-100 text-gray-700 border-gray-200",
    refunded: "bg-rose-50 text-rose-700 border-rose-200",
  };

  return (
    <div className="mx-auto max-w-5xl py-6">
      <div className="border-b border-gray-200 pb-6">
        <h1 className="font-sans text-3xl font-extrabold tracking-tight text-gray-900">
          My Account
        </h1>
        <p className="mt-1 text-xs text-gray-500">
          Welcome back, {userProfile?.name || session.user.name || "Customer"}. Manage your orders and preferences.
        </p>
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-[220px_1fr]">
        {/* Left Sidebar Navigation */}
        <aside className="flex flex-col gap-1 text-xs font-medium">
          <button
            type="button"
            className="flex items-center gap-2.5 rounded-xl bg-gray-100 px-3.5 py-2.5 font-bold text-black text-left"
          >
            <User size={15} />
            <span>Overview</span>
          </button>
          <button
            type="button"
            className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-gray-600 hover:bg-gray-50 hover:text-black text-left transition-colors"
          >
            <MapPin size={15} />
            <span>Addresses</span>
          </button>
          <button
            type="button"
            className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-gray-600 hover:bg-gray-50 hover:text-black text-left transition-colors"
          >
            <CreditCard size={15} />
            <span>Payment Methods</span>
          </button>
          <button
            type="button"
            className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-gray-600 hover:bg-gray-50 hover:text-black text-left transition-colors"
          >
            <Heart size={15} />
            <span>Wishlist</span>
          </button>
          <button
            type="button"
            className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-gray-600 hover:bg-gray-50 hover:text-black text-left transition-colors"
          >
            <Settings size={15} />
            <span>Account Settings</span>
          </button>
        </aside>

        {/* Right Main Content */}
        <div className="flex flex-col gap-8">
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
                        {order.createdAt.toLocaleDateString("en-US", {
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

          {/* Profile & Addresses Section */}
          <div id="addresses" className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-xs scroll-mt-24">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-gray-900">
                Customer Profile
              </h2>
            </div>
            <div className="mt-4 text-xs text-gray-600 space-y-1.5">
              <p className="font-bold text-gray-900">{userProfile?.name || session.user.name || "Customer"}</p>
              <p className="font-mono text-gray-500">{userProfile?.email || session.user.email}</p>
              <p className="text-[11px] text-gray-400">
                Member since {userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString() : "2026"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
