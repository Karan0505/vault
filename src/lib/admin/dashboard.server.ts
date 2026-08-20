import "server-only";
import { prisma } from "@/lib/db/prisma";
import { getBestSellingProducts } from "@/lib/catalogue/best-sellers.server";
import { formatMoney } from "@/lib/payments/money";

export interface ChartPoint {
  date: string;
  val: number;
  x: number;
  y: number;
}

export interface AdminDashboardData {
  totalRevenue: string;
  totalRevenueRaw: number;
  orderCount: number;
  avgOrderValue: string;
  newCustomers: number;
  dailyPoints: ChartPoint[];
  weeklyPoints: ChartPoint[];
  topProducts: Array<{
    name: string;
    category: string;
    revenue: string;
    orders: number;
  }>;
  inventory: {
    inStock: number;
    lowStock: number;
    outOfStock: number;
    total: number;
  };
  recentOrders: Array<{
    id: string;
    number: string;
    email: string;
    totalAmount: string;
    status: string;
    itemsCount: number;
    createdAt: string;
  }>;
}

/**
 * Computes authoritative database-aggregated dashboard statistics.
 * Invariant: Net Revenue = Completed Orders Gross - Partial/Itemized Refunds.
 * Full refunds & cancellations contribute $0.
 * AOV is strictly zero-safe.
 */
export async function getAuthoritativeDashboardData(days = 7): Promise<AdminDashboardData> {
  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const [
    grossOrdersAgg,
    refundsAgg,
    completedOrderCount,
    newCustomersCount,
    rawOrdersForChart,
    rawRefundsForChart,
    inventoryItems,
    bestSellers,
    recentOrdersList,
  ] = await Promise.all([
    // Completed gross sales
    prisma.order.aggregate({
      where: {
        status: { in: ["paid", "fulfilled", "delivered"] },
      },
      _sum: { totalAmount: true },
    }),
    // Deduct refunds on completed orders
    prisma.refund.aggregate({
      where: {
        order: { status: { in: ["paid", "fulfilled", "delivered"] } },
      },
      _sum: { amount: true },
    }),
    // Count completed orders
    prisma.order.count({
      where: {
        status: { in: ["paid", "fulfilled", "delivered"] },
      },
    }),
    // New customers in date range
    prisma.user.count({
      where: {
        staffRole: null,
        createdAt: { gte: startDate },
      },
    }),
    // Completed orders in the past 30 days for time-series charts
    prisma.order.findMany({
      where: {
        status: { in: ["paid", "fulfilled", "delivered"] },
        createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
      },
      select: {
        totalAmount: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    // Refunds in past 30 days
    prisma.refund.findMany({
      where: {
        createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
      },
      select: {
        amount: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    // Live inventory stock counts
    prisma.inventoryItem.findMany({
      select: { onHand: true },
    }),
    // Authoritative top selling products (reuses storefront sales engine)
    getBestSellingProducts(4),
    // Recent 6 orders
    prisma.order.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { items: true },
    }),
  ]);

  // Authoritative Net Revenue
  const grossTotal = grossOrdersAgg._sum.totalAmount ?? 0;
  const refundsTotal = refundsAgg._sum.amount ?? 0;
  const netRevenueRaw = Math.max(0, grossTotal - refundsTotal);

  const formattedRevenue = formatMoney({ amount: netRevenueRaw, currency: "USD" });
  const avgOrderRaw = completedOrderCount > 0 ? Math.round(netRevenueRaw / completedOrderCount) : 0;
  const formattedAvgOrder = formatMoney({ amount: avgOrderRaw, currency: "USD" });

  // Compute Daily Points (past 7 days)
  const dailyPoints: ChartPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;

    const dayGross = rawOrdersForChart
      .filter((o) => o.createdAt.getTime() >= dayStart && o.createdAt.getTime() < dayEnd)
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const dayRefunds = rawRefundsForChart
      .filter((r) => r.createdAt.getTime() >= dayStart && r.createdAt.getTime() < dayEnd)
      .reduce((sum, r) => sum + r.amount, 0);

    const dayNet = Math.max(0, dayGross - dayRefunds);

    dailyPoints.push({
      date: dateStr,
      val: dayNet,
      x: 20 + (6 - i) * 70,
      y: 140, // recalculated in chart
    });
  }

  // Normalize Daily Y coordinates between y=25 and y=160
  const maxDailyVal = Math.max(...dailyPoints.map((p) => p.val), 100);
  dailyPoints.forEach((p) => {
    p.y = Math.round(160 - (p.val / maxDailyVal) * 130);
  });

  // Compute Weekly Points (past 4 weeks)
  const weeklyPoints: ChartPoint[] = [];
  for (let i = 3; i >= 0; i--) {
    const wStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000).getTime();
    const wEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000).getTime();
    const weekLabel = `Wk ${4 - i}`;

    const weekGross = rawOrdersForChart
      .filter((o) => o.createdAt.getTime() >= wStart && o.createdAt.getTime() < wEnd)
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const weekRefunds = rawRefundsForChart
      .filter((r) => r.createdAt.getTime() >= wStart && r.createdAt.getTime() < wEnd)
      .reduce((sum, r) => sum + r.amount, 0);

    const weekNet = Math.max(0, weekGross - weekRefunds);

    weeklyPoints.push({
      date: weekLabel,
      val: weekNet,
      x: 30 + (3 - i) * 130,
      y: 140,
    });
  }

  const maxWeeklyVal = Math.max(...weeklyPoints.map((p) => p.val), 100);
  weeklyPoints.forEach((p) => {
    p.y = Math.round(160 - (p.val / maxWeeklyVal) * 130);
  });

  // Inventory Distribution
  let inStock = 0;
  let lowStock = 0;
  let outOfStock = 0;

  inventoryItems.forEach((item) => {
    if (item.onHand > 10) inStock++;
    else if (item.onHand > 0) lowStock++;
    else outOfStock++;
  });

  const totalInventory = inStock + lowStock + outOfStock;

  // Format Top Selling Products
  const topProducts = bestSellers.map((item) => ({
    name: item.title,
    category: "Storefront Best Seller",
    revenue: formatMoney({ amount: item.minPriceAmount * item.totalSold, currency: item.currency || "USD" }),
    orders: item.totalSold,
  }));

  // Format Recent Orders
  const recentOrders = recentOrdersList.map((o) => ({
    id: o.id,
    number: o.number,
    email: o.email,
    totalAmount: formatMoney({ amount: o.totalAmount, currency: o.currency || "USD" }),
    status: o.status,
    itemsCount: o.items.reduce((sum, it) => sum + it.quantity, 0),
    createdAt: o.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
  }));

  return {
    totalRevenue: formattedRevenue,
    totalRevenueRaw: netRevenueRaw,
    orderCount: completedOrderCount,
    avgOrderValue: formattedAvgOrder,
    newCustomers: newCustomersCount,
    dailyPoints,
    weeklyPoints,
    topProducts,
    inventory: {
      inStock,
      lowStock,
      outOfStock,
      total: totalInventory || 1,
    },
    recentOrders,
  };
}
