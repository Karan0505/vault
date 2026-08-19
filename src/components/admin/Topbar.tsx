
"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Bell, ChevronDown, LogOut, Store, Shield, User } from "lucide-react";

interface TopbarProps {
  userEmail: string;
  userName?: string | null;
  staffRole: string;
}

export function Topbar({ userEmail, userName, staffRole }: TopbarProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  async function handleSignOut() {
    setIsLoggingOut(true);
    setIsOpen(false);
    await signOut({ redirect: false });
    router.push("/admin/sign-in");
    router.refresh();
  }

  const displayName = userName || "Admin User";
  const avatarLetter = (userName || userEmail || "A").slice(0, 1).toUpperCase();

  return (
    <header className="flex h-16 items-center justify-between border-b border-[#1E293B] bg-[#0B0F19] px-8">
      <div className="flex items-center gap-3">
        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-xs font-medium text-slate-400">
          Server Authoritative Realtime Sync
        </span>
      </div>

      <div className="flex items-center gap-5">
        {/* Notifications */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-[#1E293B] hover:text-white transition-colors cursor-pointer"
        >
          <Bell size={17} />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-indigo-500" />
        </button>

        {/* User profile dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            className="flex items-center gap-3 rounded-xl border border-[#1E293B] bg-[#111827] px-3 py-1.5 shadow-xs transition-colors hover:border-[#334155] hover:bg-[#182235] cursor-pointer"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 text-xs font-bold text-white">
              {avatarLetter}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-white max-w-[130px] truncate">
                {displayName}
              </span>
              <span className="font-mono text-[10px] text-indigo-400 capitalize">
                {staffRole || "admin"}
              </span>
            </div>
            <ChevronDown
              size={14}
              className={`text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
            />
          </button>

          {/* Dropdown Menu */}
          {isOpen && (
            <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl border border-[#1E293B] bg-[#111827] p-2 shadow-2xl ring-1 ring-black/40 z-50 animate-in fade-in zoom-in-95 duration-100">
              {/* Profile Details */}
              <div className="border-b border-[#1E293B] px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-white truncate">{displayName}</p>
                  <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 font-mono text-[9px] font-bold text-purple-400 uppercase">
                    {staffRole || "admin"}
                  </span>
                </div>
                <p className="mt-0.5 font-mono text-[11px] text-slate-400 truncate">
                  {userEmail}
                </p>
              </div>

              {/* Navigation Actions */}
              <div className="py-1 text-xs">
                <Link
                  href="/"
                  target="_blank"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-slate-300 transition-colors hover:bg-[#1E293B] hover:text-white"
                >
                  <Store size={14} className="text-slate-400" />
                  <span>View Storefront</span>
                </Link>
                <Link
                  href="/admin/audit-log"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-slate-300 transition-colors hover:bg-[#1E293B] hover:text-white"
                >
                  <Shield size={14} className="text-slate-400" />
                  <span>Security & Audit</span>
                </Link>
              </div>

              {/* Logout CTA */}
              <div className="border-t border-[#1E293B] pt-1">
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isLoggingOut}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50 cursor-pointer text-left"
                >
                  <LogOut size={14} />
                  <span>{isLoggingOut ? "Signing out…" : "Sign out"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

