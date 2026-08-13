import { LogOut } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
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
      <div className="flex items-center gap-3">
        <Badge tone="brass">{staffRole}</Badge>
        <span className="text-sm text-ink-300">{userEmail}</span>
        <form action={handleSignOut}>
          <button
            type="submit"
            title="Log out"
            className="flex items-center gap-1.5 rounded-full border border-ink-700 bg-ink-900 px-3 py-1 text-xs font-medium text-ink-300 transition-colors hover:border-signal-red/50 hover:bg-signal-red/10 hover:text-signal-red focus:outline-none focus:ring-2 focus:ring-brass-400/30"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Exit</span>
          </button>
        </form>
      </div>
    </div>
  );
}
