import { redirect } from "next/navigation";
import { auth, requireStaff } from "@/lib/auth";
import { Sidebar } from "@/components/admin/Sidebar";
import { Topbar } from "@/components/admin/Topbar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!requireStaff(session?.user?.staffRole ?? null)) {
    redirect("/admin/sign-in");
  }

  return (
    <div className="flex min-h-screen bg-ink-950">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar userEmail={session?.user?.email ?? ""} staffRole={session?.user?.staffRole ?? ""} />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
