"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  User as UserIcon,
  LogOut,
  Package,
  Shield,
  Truck,
  HelpCircle,
  ChevronDown,
  LayoutDashboard,
  Settings,
} from "lucide-react";
import type { UserRole } from "@/lib/auth/roles";

interface AuthUserData {
  id: string;
  name?: string | null;
  email: string;
  role: UserRole;
}

export function UserAccountMenu() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) {
            setUser(null);
            setIsLoading(false);
          }
          return;
        }

        const data = await res.json();
        if (!cancelled) {
          if (data?.user?.id) {
            setUser({
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              role: (data.user.role as UserRole) || "CUSTOMER",
            });
          } else {
            setUser(null);
          }
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setIsLoading(false);
        }
      }
    }

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      window.requestIdleCallback(() => checkAuth());
    } else {
      setTimeout(checkAuth, 100);
    }

    // Listen for outside clicks to close dropdown
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      cancelled = true;
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  async function handleLogout() {
    setIsOpen(false);
    await signOut({ redirect: false });
    setUser(null);
    router.push("/");
    router.refresh();
  }

  // Loading skeleton to avoid flashing
  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 py-1 px-2">
        <div className="h-4 w-4 rounded-full bg-gray-200 dark:bg-ink-800 animate-pulse" />
        <div className="hidden h-3 w-12 rounded bg-gray-200 dark:bg-ink-800 animate-pulse sm:inline-block" />
      </div>
    );
  }

  // 1. Unauthenticated: Click directs straight to /login
  if (!user) {
    return (
      <Link
        href="/login?callbackUrl=/account"
        className="flex items-center gap-1.5 hover:text-black dark:text-gray-300 dark:hover:text-white transition-colors py-1 px-2 rounded-full hover:bg-gray-50 dark:hover:bg-ink-800"
      >
        <UserIcon size={16} strokeWidth={1.8} />
        <span className="hidden sm:inline">Account</span>
      </Link>
    );
  }

  // 2. Authenticated: Click opens interactive role-aware menu
  const roleBadgeStyles: Record<UserRole, string> = {
    CUSTOMER: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
    ADMIN: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800",
    FULFILMENT: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",
    SUPPORT: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="flex items-center gap-1.5 rounded-full py-1 px-2.5 text-xs font-semibold text-gray-800 dark:text-gray-200 transition-colors hover:bg-gray-100 dark:hover:bg-ink-800 hover:text-black dark:hover:text-white"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black dark:bg-white text-[10px] font-bold text-white dark:text-black uppercase">
          {user.name ? user.name[0] : user.email[0]}
        </span>
        <span className="hidden sm:inline max-w-[90px] truncate">
          {user.name ? user.name.split(" ")[0] : "Account"}
        </span>
        <ChevronDown size={12} className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Card */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl border border-gray-200 dark:border-ink-800 bg-white dark:bg-ink-900 p-2 shadow-xl ring-1 ring-black/5 dark:ring-white/5 z-50 animate-in fade-in zoom-in-95 duration-100">
          {/* User info banner */}
          <div className="border-b border-gray-100 dark:border-ink-800 px-3 py-2.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                {user.name || "Customer"}
              </p>
              <span
                className={`rounded-full border px-2 py-0.5 font-mono text-[9px] font-bold tracking-wider ${
                  roleBadgeStyles[user.role]
                }`}
              >
                {user.role}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400 truncate font-mono">
              {user.email}
            </p>
          </div>

          {/* Role-Specific Navigation */}
          <div className="py-1 text-xs">
            {user.role === "CUSTOMER" && (
              <>
                <Link
                  href="/account"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-ink-800 hover:text-black dark:hover:text-white transition-colors"
                >
                  <UserIcon size={14} className="text-gray-400" />
                  <span>My Account</span>
                </Link>
                <Link
                  href="/account"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-ink-800 hover:text-black dark:hover:text-white transition-colors"
                >
                  <Package size={14} className="text-gray-400" />
                  <span>My Orders</span>
                </Link>
                <Link
                  href="/account"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-ink-800 hover:text-black dark:hover:text-white transition-colors"
                >
                  <Settings size={14} className="text-gray-400" />
                  <span>Settings</span>
                </Link>
              </>
            )}

            {user.role === "ADMIN" && (
              <>
                <Link
                  href="/admin"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 font-medium text-purple-900 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors"
                >
                  <LayoutDashboard size={14} className="text-purple-600 dark:text-purple-400" />
                  <span>Admin Dashboard</span>
                </Link>
                <Link
                  href="/admin/products"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-ink-800 hover:text-black dark:hover:text-white transition-colors"
                >
                  <Package size={14} className="text-gray-400" />
                  <span>Catalogue & Products</span>
                </Link>
                <Link
                  href="/admin/orders"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-ink-800 hover:text-black dark:hover:text-white transition-colors"
                >
                  <Truck size={14} className="text-gray-400" />
                  <span>Orders & Shipments</span>
                </Link>
                <Link
                  href="/admin/inventory"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-ink-800 hover:text-black dark:hover:text-white transition-colors"
                >
                  <Shield size={14} className="text-gray-400" />
                  <span>Inventory Control</span>
                </Link>
              </>
            )}

            {user.role === "FULFILMENT" && (
              <>
                <Link
                  href="/fulfilment"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 font-medium text-blue-900 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                >
                  <LayoutDashboard size={14} className="text-blue-600 dark:text-blue-400" />
                  <span>Fulfilment Dashboard</span>
                </Link>
                <Link
                  href="/fulfilment"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-ink-800 hover:text-black dark:hover:text-white transition-colors"
                >
                  <Package size={14} className="text-gray-400" />
                  <span>Packing Queue</span>
                </Link>
              </>
            )}

            {user.role === "SUPPORT" && (
              <>
                <Link
                  href="/support"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 font-medium text-amber-900 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                >
                  <LayoutDashboard size={14} className="text-amber-600 dark:text-amber-400" />
                  <span>Support Dashboard</span>
                </Link>
                <Link
                  href="/support"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-ink-800 hover:text-black dark:hover:text-white transition-colors"
                >
                  <HelpCircle size={14} className="text-gray-400" />
                  <span>Customer Tickets</span>
                </Link>
              </>
            )}
          </div>

          {/* Sign Out Action */}
          <div className="border-t border-gray-100 dark:border-ink-800 pt-1">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-left"
            >
              <LogOut size={14} />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
