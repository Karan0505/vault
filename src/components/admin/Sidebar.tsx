import Link from "next/link";
import { LayoutGrid, Package, FolderTree, Boxes } from "lucide-react";

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutGrid },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/collections", label: "Collections", icon: Boxes },
] as const;

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-ink-800 bg-ink-900/40 md:block">
      <div className="flex h-16 items-center gap-2.5 border-b border-ink-800 px-6">
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-brass-400/50 text-[11px] font-display italic text-brass-300">
          V
        </span>
        <span className="font-display text-sm tracking-wide text-ink-100">Ops console</span>
      </div>
      <nav className="flex flex-col gap-1 p-4">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink-300 transition-colors hover:bg-ink-800 hover:text-ink-50"
          >
            <Icon size={16} strokeWidth={1.75} />
            {label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto p-4">
        <Link
          href="/"
          className="block rounded-lg border border-ink-700 px-3 py-2.5 text-center text-xs text-ink-400 transition-colors hover:border-brass-400/40 hover:text-brass-300"
        >
          View storefront ↗
        </Link>
      </div>
    </aside>
  );
}
