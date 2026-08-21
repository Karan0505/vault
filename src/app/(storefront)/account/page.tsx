import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import { requireCustomer } from "@/lib/auth/rbac";
import { getCustomerAddresses } from "@/lib/account/addresses.server";
import { AccountView } from "@/components/account/AccountView";

export const metadata: Metadata = { title: "My Account" };

export default async function AccountPage() {
  // Server-side RBAC Guard: Requires authenticated CUSTOMER
  const { session } = await requireCustomer({ redirectTo: "/account" });

  // Resolve user in DB by id or email to protect against stale JWT session cookies
  let effectiveUserId = session.user.id;
  const dbUser = await prisma.user.findFirst({
    where: {
      OR: [
        { id: session.user.id },
        ...(session.user.email ? [{ email: session.user.email.toLowerCase().trim() }] : []),
      ],
    },
  });

  if (dbUser) {
    effectiveUserId = dbUser.id;
  }

  // STRICT Customer Data Isolation: Query strictly scoped by effectiveUserId
  const [orders, userProfile, addresses] = await Promise.all([
    prisma.order.findMany({
      where: { userId: effectiveUserId },
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { items: true },
    }),
    prisma.user.findUnique({
      where: { id: effectiveUserId },
      select: { name: true, email: true, createdAt: true },
    }),
    getCustomerAddresses(effectiveUserId!),
  ]);

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

      <AccountView
        userProfile={{
          name: userProfile?.name || session.user.name || null,
          email: userProfile?.email || session.user.email || null,
          createdAt: userProfile?.createdAt || new Date(),
        }}
        orders={orders.map((o: { id: string; number: string; status: string; totalAmount: number; currency: string; createdAt: Date }) => ({
          id: o.id,
          number: o.number,
          status: o.status,
          totalAmount: o.totalAmount,
          currency: o.currency,
          createdAt: o.createdAt,
        }))}
        initialAddresses={addresses.map((a: { id: string; userId: string; label: string; fullName: string; address: string; apartment?: string | null; city: string; state: string; zip: string; country: string; phone?: string | null; isDefault: boolean; createdAt: Date; updatedAt: Date }) => ({
          ...a,
          createdAt: a.createdAt.toISOString(),
          updatedAt: a.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}

