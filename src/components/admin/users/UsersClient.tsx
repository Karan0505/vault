"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Shield, UserPlus, Search, CheckCircle2, AlertCircle, Loader2, DollarSign } from "lucide-react";
import type { SanitizedUser } from "@/lib/auth/users.server";

interface UsersClientProps {
  staff: SanitizedUser[];
  customers: SanitizedUser[];
}

export function UsersClient({ staff, customers }: UsersClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"staff" | "customers">("staff");
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "fulfilment" | "support">("support");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const filteredStaff = staff.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (s.name && s.name.toLowerCase().includes(q)) ||
      s.email.toLowerCase().includes(q) ||
      (s.staffRole && s.staffRole.toLowerCase().includes(q))
    );
  });

  const filteredCustomers = customers.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      c.email.toLowerCase().includes(q)
    );
  });

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          email: email.trim(),
          password,
          role,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.error || "Failed to create staff account");
      }

      setActionSuccess(`Staff account for ${email} created with role "${role.toUpperCase()}"!`);
      setIsModalOpen(false);
      setName("");
      setEmail("");
      setPassword("");
      setRole("support");
      router.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Creation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update user role");
      }

      setActionSuccess(`Staff role updated successfully to "${newRole.toUpperCase()}".`);
      router.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Role update failed");
    }
  };

  const roleColorMap: Record<string, string> = {
    admin: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    fulfilment: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    support: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  };

  return (
    <div className="flex flex-col gap-8 text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-sans text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Users & Roles Directory
          </h1>
          <p className="mt-1 font-mono text-xs text-slate-400">
            Staff permission roles, RBAC access governance, and customer account directory
          </p>
        </div>

        {activeTab === "staff" && (
          <button
            type="button"
            onClick={() => {
              setIsModalOpen(true);
              setActionError(null);
              setActionSuccess(null);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 font-sans text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 transition-colors"
          >
            <UserPlus size={16} />
            <span>Add Staff Member</span>
          </button>
        )}
      </div>

      {/* KPI Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex items-center justify-between rounded-2xl border border-[#1E293B] bg-[#111827] p-5 shadow-panel">
          <div>
            <p className="font-sans text-xs font-semibold text-slate-400">Active Staff Accounts</p>
            <p className="mt-1 font-mono text-2xl font-bold text-indigo-400">{staff.length}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
            <Shield size={20} />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-[#1E293B] bg-[#111827] p-5 shadow-panel">
          <div>
            <p className="font-sans text-xs font-semibold text-slate-400">Registered Customers</p>
            <p className="mt-1 font-mono text-2xl font-bold text-emerald-400">{customers.length}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <Users size={20} />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-[#1E293B] bg-[#111827] p-5 shadow-panel">
          <div>
            <p className="font-sans text-xs font-semibold text-slate-400">Administrators</p>
            <p className="mt-1 font-mono text-2xl font-bold text-white">
              {staff.filter((s) => s.staffRole === "admin").length}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1E293B] text-slate-300">
            <Shield size={20} />
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

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-[#1E293B] bg-[#111827] p-4 shadow-panel">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("staff")}
            className={`rounded-lg px-4 py-2 font-sans text-xs font-semibold transition-colors ${
              activeTab === "staff" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            Staff Directory ({staff.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("customers")}
            className={`rounded-lg px-4 py-2 font-sans text-xs font-semibold transition-colors ${
              activeTab === "customers" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            Customer Accounts ({customers.length})
          </button>
        </div>

        <div className="relative min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder={activeTab === "staff" ? "Search staff name, email, role..." : "Search customer name, email..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[#1E293B] bg-[#0B0F19] py-2 pl-8 pr-3 font-sans text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Staff Table */}
      {activeTab === "staff" && (
        <div className="overflow-hidden rounded-2xl border border-[#1E293B] bg-[#111827] shadow-panel">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans text-xs">
              <thead className="border-b border-[#1E293B] bg-[#0B0F19]/50 font-mono text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-3.5">Staff Member</th>
                  <th className="px-6 py-3.5">Email</th>
                  <th className="px-6 py-3.5">Current Role</th>
                  <th className="px-6 py-3.5">Assigned Date</th>
                  <th className="px-6 py-3.5 text-right">Role Management</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B] text-slate-300">
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-mono text-xs">
                      No staff members found matching query.
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((member) => (
                    <tr key={member.id} className="hover:bg-[#1E293B]/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-white">{member.name || "Staff Member"}</td>
                      <td className="px-6 py-4 font-mono text-slate-300">{member.email}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-md border px-2.5 py-1 font-mono text-[10px] font-bold uppercase ${
                            roleColorMap[member.staffRole || "support"] ?? roleColorMap.support
                          }`}
                        >
                          {member.staffRole}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-400">
                        {new Date(member.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <select
                          value={member.staffRole || "support"}
                          onChange={(e) => handleRoleChange(member.id, e.target.value)}
                          className="rounded-lg border border-[#1E293B] bg-[#0B0F19] px-2.5 py-1 font-sans text-xs text-white focus:border-indigo-500 focus:outline-hidden"
                        >
                          <option value="admin">Admin</option>
                          <option value="fulfilment">Fulfilment</option>
                          <option value="support">Support</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Customer Directory Table */}
      {activeTab === "customers" && (
        <div className="overflow-hidden rounded-2xl border border-[#1E293B] bg-[#111827] shadow-panel">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans text-xs">
              <thead className="border-b border-[#1E293B] bg-[#0B0F19]/50 font-mono text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-3.5">Customer Name</th>
                  <th className="px-6 py-3.5">Email</th>
                  <th className="px-6 py-3.5">Completed Orders</th>
                  <th className="px-6 py-3.5">Lifetime Spend</th>
                  <th className="px-6 py-3.5">Saved Addresses</th>
                  <th className="px-6 py-3.5">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B] text-slate-300">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-mono text-xs">
                      No customer accounts found matching query.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((cust) => (
                    <tr key={cust.id} className="hover:bg-[#1E293B]/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-white">{cust.name || "VAULT Customer"}</td>
                      <td className="px-6 py-4 font-mono text-slate-300">{cust.email}</td>
                      <td className="px-6 py-4 font-mono font-bold text-white">{cust.orderCount ?? 0}</td>
                      <td className="px-6 py-4 font-mono font-bold text-indigo-300">
                        ${((cust.totalSpent ?? 0) / 100).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-400">{cust.addressCount ?? 0}</td>
                      <td className="px-6 py-4 font-mono text-slate-400">
                        {new Date(cust.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[#1E293B] bg-[#111827] p-6 shadow-2xl">
            <h3 className="font-sans text-base font-bold text-white">Add Staff Member</h3>
            <p className="font-mono text-xs text-slate-400 mt-1">
              Create an administrative user with verified RBAC role access.
            </p>

            <form onSubmit={handleCreateStaff} className="mt-5 flex flex-col gap-4">
              <div>
                <label className="block font-sans text-xs font-semibold text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alex Morgan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-[#1E293B] bg-[#0B0F19] px-3.5 py-2 font-sans text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-sans text-xs font-semibold text-slate-300 mb-1">
                  Email Address <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="staff@vault.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-[#1E293B] bg-[#0B0F19] px-3.5 py-2 font-sans text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-sans text-xs font-semibold text-slate-300 mb-1">
                  Secure Password <span className="text-rose-400">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="Min 8 chars, 1 number, 1 special char"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-[#1E293B] bg-[#0B0F19] px-3.5 py-2 font-sans text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-sans text-xs font-semibold text-slate-300 mb-1">
                  Staff Role Assignment
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full rounded-xl border border-[#1E293B] bg-[#0B0F19] px-3.5 py-2 font-sans text-xs text-white focus:border-indigo-500 focus:outline-hidden"
                >
                  <option value="admin">Administrator (Full Access)</option>
                  <option value="fulfilment">Fulfilment Operator</option>
                  <option value="support">Support Agent</option>
                </select>
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
                  <span>Save Staff Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
