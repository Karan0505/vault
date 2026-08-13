import Link from "next/link";
import { Search, ShieldCheck, Truck } from "lucide-react";
import { CartCountBadge } from "./CartCountBadge";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-800 bg-ink-950/90 backdrop-blur-md">
      {/* Top Utility & Announcement Bar (Navbar 1) */}
      <div className="border-b border-ink-850 bg-ink-900/70 px-6 py-1.5 text-xs text-ink-400">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2 font-mono">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-brass-400 animate-pulse" />
            <span className="text-brass-300 font-semibold">FREE WORLDWIDE SHIPPING</span>
            
          </div>
          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span className="hidden md:inline-flex items-center gap-1 text-ink-400">
              <Truck size={12} className="text-brass-400" /> Express Delivery
            </span>
            <span className="hidden md:inline text-ink-700">•</span>
            <span className="hidden md:inline-flex items-center gap-1 text-ink-400">
              <ShieldCheck size={12} className="text-brass-400" /> Authenticity Guaranteed
            </span>
            <Link href="/admin" className="text-brass-300 hover:text-brass-200 transition-colors">
              Ops Console →
            </Link>
          </div>
        </div>
      </div>

      {/* Main Brand & Category Navigation Bar (Navbar 2) */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
        <Link href="/" className="group flex items-center gap-2.5">
          <span
            aria-hidden
            className="flex h-8 w-8 items-center justify-center rounded-full border border-brass-400/50 text-[14px] font-display italic text-brass-300 transition-transform duration-300 group-hover:rotate-[20deg]"
          >
            V
          </span>
          <span className="font-display text-xl tracking-tight text-ink-50">VAULT</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-ink-300 md:flex">
          <Link href="/search" className="transition-colors hover:text-ink-50">
            All Products
          </Link>
          <Link href="/categories/outerwear" className="transition-colors hover:text-ink-50">
            Outerwear
          </Link>
          <Link href="/categories/footwear" className="transition-colors hover:text-ink-50">
            Footwear
          </Link>
          <Link href="/categories/accessories" className="transition-colors hover:text-ink-50">
            Accessories
          </Link>
        </nav>

        <div className="flex items-center gap-5 text-sm text-ink-300">
          <Link href="/search" aria-label="Search" className="flex items-center gap-1.5 text-ink-300 transition-colors hover:text-ink-50">
            <Search size={18} strokeWidth={1.75} />
            <span className="hidden sm:inline text-xs font-mono">Search</span>
          </Link>
          <CartCountBadge />
        </div>
      </div>
    </header>
  );
}
