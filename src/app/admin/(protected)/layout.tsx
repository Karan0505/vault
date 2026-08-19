import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/admin/Sidebar";
import { Topbar } from "@/components/admin/Topbar";
import { getEffectiveRole } from "@/lib/roles";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session || !session.user) {
    redirect("/login?callbackUrl=/admin");
  }

  const role = session.user.role || getEffectiveRole(session.user);
  if (role !== "ADMIN") {
    redirect("/forbidden");
  }

  return (
    <div className="flex min-h-screen bg-ink-950">
      <Sidebar staffRole={session.user.staffRole ?? null} />
      <div className="flex flex-1 flex-col">
        <Topbar
          userEmail={session.user.email ?? ""}
          userName={session.user.name ?? undefined}
          staffRole={session.user.staffRole ?? "admin"}
        />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
