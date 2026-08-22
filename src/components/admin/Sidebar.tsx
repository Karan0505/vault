import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  Boxes,
  ClipboardList,
  Warehouse,
  ScrollText,
  Users,
  Percent,
  Truck,
  RotateCcw,
  Settings,
  Store,
} from "lucide-react";
import type { StaffRole } from "@prisma/client";
import type { Permission } from "@/lib/auth/permissions";
import { hasPermission } from "@/lib/auth/permissions";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  permission: Permission | null;
}


interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "OVERVIEW",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, permission: null },
      { href: "/admin/orders", label: "Orders", icon: ClipboardList, permission: "orders:view" },
      { href: "/admin/products", label: "Products", icon: Package, permission: null },
      { href: "/admin/inventory", label: "Inventory", icon: Warehouse, permission: "inventory:view" },
      { href: "/admin/categories", label: "Categories", icon: Boxes, permission: null },
    ],
  },
  {
    title: "OPERATIONS",
    items: [
      { href: "/admin/fulfillment", label: "Fulfillment", icon: Truck, permission: "orders:fulfil" },
      { href: "/admin/refunds", label: "Refunds", icon: RotateCcw, permission: "refunds:issue" },
      { href: "/admin/discounts", label: "Discounts", icon: Percent, permission: "discounts:manage" },
      { href: "/admin/audit-log", label: "Audit Log", icon: ScrollText, permission: "audit-log:view" },
    ],
  },
  {
    title: "SETTINGS",
    items: [
      { href: "/admin/users", label: "Users & Roles", icon: Users, permission: "staff:manage" },
      { href: "/admin/settings", label: "Settings", icon: Settings, permission: "settings:manage" },
    ],
  },
];


export function Sidebar({ staffRole }: { staffRole: StaffRole | null }) {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-[#1E293B] bg-[#0B0F19] flex-col justify-between md:flex">
      <div>
        {/* Brand Header */}
        <div className="flex h-16 items-center gap-3 border-b border-[#1E293B] px-6">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white shadow-glow">
            ∇
          </span>
          <span className="font-sans text-base font-bold tracking-tight text-white">
            VAULT
          </span>
          <span className="ml-auto rounded-md bg-indigo-950/80 px-2 py-0.5 font-mono text-[10px] font-semibold text-indigo-400 border border-indigo-800/60">
            OPS
          </span>
        </div>

        {/* Navigation Groups */}
        <nav className="flex flex-col gap-6 p-4">
          {navGroups.map((group) => (
            <div key={group.title} className="flex flex-col gap-1">
              <span className="px-3 text-[10px] font-bold tracking-wider text-slate-500 font-mono">
                {group.title}
              </span>
              {group.items
                .filter((item) => item.permission === null || hasPermission(staffRole, item.permission))
                .map(({ href, label, icon: Icon }) => (
                  <Link
                    key={`${group.title}-${label}`}
                    href={href}
                    className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 transition-all hover:bg-[#1E293B] hover:text-white group"
                  >
                    <Icon size={15} className="text-slate-400 group-hover:text-indigo-400 transition-colors" />
                    <span>{label}</span>
                  </Link>
                ))}
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom Storefront link */}
      <div className="border-t border-[#1E293B] p-4">
        <Link
          href="/"
          className="flex items-center justify-center gap-2 rounded-xl border border-[#1E293B] bg-[#111827] px-3.5 py-2.5 text-xs font-semibold text-slate-300 transition-colors hover:border-slate-700 hover:bg-[#182235] hover:text-white"
        >
          <Store size={14} className="text-slate-400" />
          <span>View Storefront ↗</span>
        </Link>
      </div>
    </aside>
  );
}

