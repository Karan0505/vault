import { Badge } from "@/components/ui/Badge";
import { LogOut } from "lucide-react";
import { signOut } from "@/lib/auth";

export function Topbar({ userEmail, staffRole }: { userEmail: string; staffRole: string }) {
  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/admin/sign-in" });
  }

  return (
    <div className="flex h-16 items-center justify-between border-b border-ink-800 px-8">
      <p className="text-sm text-ink-400">
        Catalogue and operations — every write here revalidates the storefront in seconds.
      </p>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5 rounded-full border border-ink-800 bg-ink-900/80 py-1 pl-1.5 pr-3">
          <Badge tone="brass">{staffRole || "staff"}</Badge>
          <span className="font-mono text-xs text-ink-200">{userEmail}</span>
        </div>
        <form action={handleSignOut}>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-900 px-3 py-1.5 text-xs font-medium text-ink-300 transition-colors hover:border-signal-red/50 hover:bg-signal-red/10 hover:text-signal-red focus:outline-none"
            title="Sign out of admin dashboard"
          >
            <LogOut size={14} />
            <span>Exit</span>
          </button>
        </form>
      </div>
    </div>
  );
}
