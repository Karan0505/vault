import { signOut } from "@/lib/auth";
import { Badge } from "@/components/ui/Badge";
import { LogOut } from "lucide-react";

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
        <Badge tone="brass">{staffRole}</Badge>
        <span className="text-sm text-ink-300">{userEmail}</span>
        <form action={handleSignOut}>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-900 px-3 py-1.5 text-xs text-ink-300 transition-colors hover:border-ink-600 hover:bg-ink-800 hover:text-ink-100"
            title="Sign out of console"
          >
            <LogOut size={14} />
            <span>Sign out</span>
          </button>
        </form>
      </div>
    </div>
  );
}
