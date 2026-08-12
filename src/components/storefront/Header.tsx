import Link from "next/link";
import { CartCountBadge } from "./CartCountBadge";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-800 bg-ink-950/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="group flex items-center gap-2.5">
          <span
            aria-hidden
            className="flex h-7 w-7 items-center justify-center rounded-full border border-brass-400/50 text-[13px] font-display italic text-brass-300 transition-transform duration-300 group-hover:rotate-[20deg]"
          >
            V
          </span>
          <span className="font-display text-lg tracking-tight text-ink-50">VAULT</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-ink-300 md:flex">
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
          <Link href="/admin" className="eyebrow hover:text-brass-300">
            Ops console
          </Link>
          <CartCountBadge />
        </div>
      </div>
    </header>
  );
}
