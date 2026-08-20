"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tag, Plus, Trash2, CheckCircle2, AlertCircle, Loader2, Search, Percent, ShieldCheck } from "lucide-react";

export interface AdminDiscount {
  id: string;
  code: string;
  type: "percentage" | "fixed_amount" | "free_shipping";
  value: number;
  currency: string | null;
  usageLimit: number | null;
  perCustomerLimit: number | null;
  minimumSpend: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  redemptionCount: number;
  orderCount: number;
  createdAt: string;
}

interface DiscountsClientProps {
  discounts: AdminDiscount[];
  stats: {
    activeCount: number;
    totalRedemptions: number;
    totalCodes: number;
  };
}

export function DiscountsClient({ discounts, stats }: DiscountsClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [code, setCode] = useState("");
  const [type, setType] = useState<"percentage" | "fixed_amount" | "free_shipping">("percentage");
  const [value, setValue] = useState(15);
  const [minimumSpendDollars, setMinimumSpendDollars] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [perCustomerLimit, setPerCustomerLimit] = useState("1");
  const [expiresAt, setExpiresAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const filteredDiscounts = discounts.filter((d) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return d.code.toLowerCase().includes(q) || d.type.toLowerCase().includes(q);
  });

  const handleCreateDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const minSpendCents = minimumSpendDollars ? Math.round(parseFloat(minimumSpendDollars) * 100) : null;
      const numericVal = type === "fixed_amount" ? Math.round(value * 100) : value;

      const payload = {
        code: code.trim().toUpperCase(),
        type,
        value: type === "free_shipping" ? 0 : numericVal,
        currency: type === "fixed_amount" ? "USD" : undefined,
        usageLimit: usageLimit ? parseInt(usageLimit, 10) : null,
        perCustomerLimit: perCustomerLimit ? parseInt(perCustomerLimit, 10) : 1,
        minimumSpend: minSpendCents,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        isActive: true,
      };

      const res = await fetch("/api/admin/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.error || "Failed to create discount code");
      }

      setActionSuccess(`Discount code "${payload.code}" created successfully!`);
      setIsModalOpen(false);
      setCode("");
      setValue(15);
      setMinimumSpendDollars("");
      setUsageLimit("");
      setExpiresAt("");
      router.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Creation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (discountId: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/discounts/${discountId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update discount status");
      }

      router.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Status update failed");
    }
  };

  const handleDeleteOrArchive = async (discountId: string, codeName: string) => {
    if (!confirm(`Are you sure you want to deactivate or remove discount "${codeName}"?`)) return;

    try {
      const res = await fetch(`/api/admin/discounts/${discountId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete discount");
      }

      if (data.archived) {
        setActionSuccess(`Discount "${codeName}" has redemption history — safely archived as inactive.`);
      } else {
        setActionSuccess(`Discount "${codeName}" permanently removed.`);
      }
      router.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Deletion failed");
    }
  };

  const formatDiscountValue = (d: AdminDiscount) => {
    if (d.type === "percentage") return `${d.value}% OFF`;
    if (d.type === "fixed_amount") return `$${(d.value / 100).toFixed(2)} OFF`;
    return "FREE SHIPPING";
  };

  return (
    <div className="flex flex-col gap-8 text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-sans text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Discounts & Coupons Manager
          </h1>
          <p className="mt-1 font-mono text-xs text-slate-400">
            Promotional codes, percentage discounts, minimum spends, and usage thresholds
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsModalOpen(true);
            setActionError(null);
            setActionSuccess(null);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 font-sans text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 transition-colors"
        >
          <Plus size={16} />
          <span>Create Coupon Code</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex items-center justify-between rounded-2xl border border-[#1E293B] bg-[#111827] p-5 shadow-panel">
          <div>
            <p className="font-sans text-xs font-semibold text-slate-400">Active Coupons</p>
            <p className="mt-1 font-mono text-2xl font-bold text-emerald-400">{stats.activeCount}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <Tag size={20} />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-[#1E293B] bg-[#111827] p-5 shadow-panel">
          <div>
            <p className="font-sans text-xs font-semibold text-slate-400">Total Redemptions</p>
            <p className="mt-1 font-mono text-2xl font-bold text-indigo-400">{stats.totalRedemptions}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
            <ShieldCheck size={20} />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-[#1E293B] bg-[#111827] p-5 shadow-panel">
          <div>
            <p className="font-sans text-xs font-semibold text-slate-400">Total Configured Codes</p>
            <p className="mt-1 font-mono text-2xl font-bold text-white">{stats.totalCodes}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1E293B] text-slate-300">
            <Percent size={20} />
          </div>
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

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#1E293B] bg-[#111827] p-4 shadow-panel">
        <div className="relative w-full max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search discount code, coupon type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[#1E293B] bg-[#0B0F19] py-2 pl-8 pr-3 font-sans text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-hidden"
          />
        </div>
        <span className="font-mono text-xs text-slate-400">
          Showing {filteredDiscounts.length} {filteredDiscounts.length === 1 ? "coupon" : "coupons"}
        </span>
      </div>

      {/* Discounts Table */}
      <div className="overflow-hidden rounded-2xl border border-[#1E293B] bg-[#111827] shadow-panel">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans text-xs">
            <thead className="border-b border-[#1E293B] bg-[#0B0F19]/50 font-mono text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-3.5">Code</th>
                <th className="px-6 py-3.5">Benefit</th>
                <th className="px-6 py-3.5">Type</th>
                <th className="px-6 py-3.5">Redemptions</th>
                <th className="px-6 py-3.5">Min Spend</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B] text-slate-300">
              {filteredDiscounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-mono text-xs">
                    No discount codes found. Click &quot;Create Coupon Code&quot; to add one.
                  </td>
                </tr>
              ) : (
                filteredDiscounts.map((discount) => (
                  <tr key={discount.id} className="hover:bg-[#1E293B]/30 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-indigo-300">
                      <span className="rounded-lg bg-[#0B0F19] border border-[#1E293B] px-2.5 py-1">
                        {discount.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-white">
                      {formatDiscountValue(discount)}
                    </td>
                    <td className="px-6 py-4 font-sans text-slate-400 capitalize">
                      {discount.type.replace("_", " ")}
                    </td>
                    <td className="px-6 py-4 font-mono">
                      <span className="font-bold text-white">{discount.redemptionCount}</span>
                      <span className="text-slate-500">
                        {discount.usageLimit ? ` / ${discount.usageLimit}` : " (unlimited)"}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-400">
                      {discount.minimumSpend ? `$${(discount.minimumSpend / 100).toFixed(2)}` : "None"}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(discount.id, discount.isActive)}
                        className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold uppercase transition-colors ${
                          discount.isActive
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                            : "bg-slate-500/10 text-slate-400 border border-slate-500/20 hover:bg-slate-500/20"
                        }`}
                      >
                        {discount.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteOrArchive(discount.id, discount.code)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                        title={discount.redemptionCount > 0 ? "Archive discount" : "Delete discount"}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-[#1E293B] bg-[#111827] p-6 shadow-2xl">
            <h3 className="font-sans text-base font-bold text-white">Create Discount Code</h3>
            <p className="font-mono text-xs text-slate-400 mt-1">
              Add a new promotional voucher code for checkout redemptions.
            </p>

            <form onSubmit={handleCreateDiscount} className="mt-5 flex flex-col gap-4">
              <div>
                <label className="block font-sans text-xs font-semibold text-slate-300 mb-1">
                  Coupon Code <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SUMMER25, VAULTVIP, FREESHIP"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-[#1E293B] bg-[#0B0F19] px-3.5 py-2 font-mono text-xs font-bold text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-hidden uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-sans text-xs font-semibold text-slate-300 mb-1">
                    Discount Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full rounded-xl border border-[#1E293B] bg-[#0B0F19] px-3.5 py-2 font-sans text-xs text-white focus:border-indigo-500 focus:outline-hidden"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed_amount">Fixed Dollar ($)</option>
                    <option value="free_shipping">Free Shipping</option>
                  </select>
                </div>

                {type !== "free_shipping" && (
                  <div>
                    <label className="block font-sans text-xs font-semibold text-slate-300 mb-1">
                      {type === "percentage" ? "Percentage Value (%)" : "Dollar Amount ($)"}
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={type === "percentage" ? 100 : 10000}
                      value={value}
                      onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-xl border border-[#1E293B] bg-[#0B0F19] px-3.5 py-2 font-mono text-xs text-white focus:border-indigo-500 focus:outline-hidden"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-sans text-xs font-semibold text-slate-300 mb-1">
                    Minimum Spend ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="Optional (e.g. 50.00)"
                    value={minimumSpendDollars}
                    onChange={(e) => setMinimumSpendDollars(e.target.value)}
                    className="w-full rounded-xl border border-[#1E293B] bg-[#0B0F19] px-3.5 py-2 font-mono text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-sans text-xs font-semibold text-slate-300 mb-1">
                    Total Usage Limit
                  </label>
                  <input
                    type="number"
                    min={1}
                    placeholder="Unlimited if blank"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(e.target.value)}
                    className="w-full rounded-xl border border-[#1E293B] bg-[#0B0F19] px-3.5 py-2 font-mono text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-sans text-xs font-semibold text-slate-300 mb-1">
                    Per-Customer Limit
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={perCustomerLimit}
                    onChange={(e) => setPerCustomerLimit(e.target.value)}
                    className="w-full rounded-xl border border-[#1E293B] bg-[#0B0F19] px-3.5 py-2 font-mono text-xs text-white focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-sans text-xs font-semibold text-slate-300 mb-1">
                    Expiry Date (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full rounded-xl border border-[#1E293B] bg-[#0B0F19] px-3.5 py-2 font-mono text-xs text-white focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-3 border-t border-[#1E293B] pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setActionError(null);
                  }}
                  className="rounded-xl border border-[#1E293B] px-4 py-2 font-sans text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 font-sans text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                  <span>Save Coupon Code</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
