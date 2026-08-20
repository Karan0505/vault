import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { Card } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";

interface AuditLogPageProps {
  searchParams: Promise<{ entityType?: string }>;
}

const ACTION_TONE: Record<string, "green" | "amber" | "red" | "neutral" | "brass"> = {
  create: "green",
  update: "brass",
  delete: "red",
  transition: "amber",
  refund: "red",
  adjustment: "neutral",
};

const ENTITY_TYPES = ["Product", "Order", "Fulfillment", "Refund", "InventoryItem"];

export default async function AdminAuditLogPage({ searchParams }: AuditLogPageProps) {
  const session = await auth();
  if (!hasPermission(session?.user.staffRole ?? null, "audit-log:view")) {
    redirect("/admin");
  }

  const { entityType } = await searchParams;

  const entries = await prisma.auditLogEntry.findMany({
    where: entityType ? { entityType } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="eyebrow">Operations</p>
        <h1 className="mt-2 font-display text-3xl text-ink-50">Audit log</h1>
        <p className="mt-2 max-w-lg text-sm text-ink-500">
          Append-only — this list is generated purely from{" "}
          <code className="font-mono text-ink-400">appendAuditLog()</code> calls; there is no edit or delete
          path for these rows anywhere in the codebase, and the database rejects both directly. See ADR 0018.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <a
          href="/admin/audit-log"
          className={`rounded-full border px-3 py-1.5 ${!entityType ? "border-brass-400 text-brass-300" : "border-ink-700 text-ink-400"}`}
        >
          All
        </a>
        {ENTITY_TYPES.map((type) => (
          <a
            key={type}
            href={`/admin/audit-log?entityType=${type}`}
            className={`rounded-full border px-3 py-1.5 ${entityType === type ? "border-brass-400 text-brass-300" : "border-ink-700 text-ink-400"}`}
          >
            {type}
          </a>
        ))}
      </div>

      <Card className="p-0">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-ink-800 text-xs uppercase tracking-wide text-ink-500">
              <th className="px-6 py-3.5 font-medium">When</th>
              <th className="px-6 py-3.5 font-medium">Actor</th>
              <th className="px-6 py-3.5 font-medium">Entity</th>
              <th className="px-6 py-3.5 font-medium">Action</th>
              <th className="px-6 py-3.5 font-medium">Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-800">
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-ink-500">
                  No entries yet.
                </td>
              </tr>
            )}
            {entries.map((entry) => (
              <tr key={entry.id} className="align-top">
                <td className="whitespace-nowrap px-6 py-4 text-xs text-ink-500">
                  {entry.createdAt.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-xs text-ink-400">
                  {entry.actorEmail}
                  {entry.actorRole && <span className="ml-1 text-ink-600">({entry.actorRole})</span>}
                </td>
                <td className="px-6 py-4 font-mono text-xs text-ink-300">
                  {entry.entityType}
                  <br />
                  <span className="text-ink-600">{entry.entityId.slice(0, 12)}…</span>
                </td>
                <td className="px-6 py-4">
                  <Badge tone={ACTION_TONE[entry.action] ?? "neutral"}>{entry.action}</Badge>
                </td>
                <td className="max-w-md px-6 py-4">
                  <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-[11px] text-ink-500">
                    {entry.before ? `before: ${JSON.stringify(entry.before)}\n` : ""}
                    {entry.after ? `after: ${JSON.stringify(entry.after)}` : ""}
                  </pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
