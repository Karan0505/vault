import { getAdminDiscounts } from "@/lib/checkout/discounts-admin.server";
import { DiscountsClient, type AdminDiscount } from "@/components/admin/discounts/DiscountsClient";

export default async function AdminDiscountsPage() {
  const discounts = await getAdminDiscounts();

  const typedDiscounts: AdminDiscount[] = discounts.map((d) => ({
    id: d.id,
    code: d.code,
    type: d.type as any,
    value: d.value,
    currency: d.currency,
    usageLimit: d.usageLimit,
    perCustomerLimit: d.perCustomerLimit,
    minimumSpend: d.minimumSpend,
    startsAt: d.startsAt,
    expiresAt: d.expiresAt,
    isActive: d.isActive,
    redemptionCount: d.redemptionCount,
    orderCount: d.orderCount,
    createdAt: new Date(d.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
  }));

  const stats = {
    activeCount: typedDiscounts.filter((d) => d.isActive).length,
    totalRedemptions: typedDiscounts.reduce((sum, d) => sum + d.redemptionCount, 0),
    totalCodes: typedDiscounts.length,
  };

  return <DiscountsClient discounts={typedDiscounts} stats={stats} />;
}
