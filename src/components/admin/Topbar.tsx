import { Bell, ShieldCheck, ChevronDown } from "lucide-react";

export function Topbar({ userEmail, staffRole }: { userEmail: string; staffRole: string }) {
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
          className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-[#1E293B] hover:text-white transition-colors"
        >
          <Bell size={17} />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-indigo-500" />
        </button>

        {/* User profile pill */}
        <div className="flex items-center gap-3 rounded-xl border border-[#1E293B] bg-[#111827] px-3 py-1.5 shadow-xs">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 text-xs font-bold text-white">
            {userEmail.slice(0, 1).toUpperCase()}
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold text-white">Admin User</span>
            <span className="font-mono text-[10px] text-indigo-400 capitalize">{staffRole || "Storemaster"}</span>
          </div>
          <ChevronDown size={14} className="text-slate-500" />
        </div>
      </div>
    </header>
  );
}

