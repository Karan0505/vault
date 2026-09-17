import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { CartCountBadge } from "@/components/cart/CartCountBadge";
import { WishlistCountBadge } from "@/components/wishlist/WishlistCountBadge";
import { HeaderSearch } from "./HeaderSearch";
import { UserAccountMenu } from "./UserAccountMenu";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-md transition-all dark:border-ink-800 dark:bg-ink-950/95">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-3.5">
        {/* Left: Brand Logo */}
        <div className="flex items-center gap-8">
          <Link href="/" className="group flex items-center gap-2.5">
            <span
              aria-hidden
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-black text-[14px] font-bold text-white shadow-sm transition-transform duration-300 group-hover:scale-105 dark:bg-white dark:text-black"
            >
              ∇
            </span>
            <span className="font-sans text-xl font-bold tracking-tight text-black dark:text-white">
              VAULT
            </span>
          </Link>

          {/* Nav links */}
          <nav className="hidden items-center gap-6 text-[13px] font-medium text-gray-700 md:flex dark:text-gray-300">
            <Link href="/search" className="flex items-center gap-1 transition-colors hover:text-black dark:hover:text-white font-semibold">
              <span>Shop</span>
              <ChevronDown size={13} className="text-gray-400 dark:text-gray-500" />
            </Link>
            <Link href="/categories/outerwear" className="transition-colors hover:text-black dark:hover:text-white">
              Collections
            </Link>
            <Link href="/categories/footwear" className="transition-colors hover:text-black dark:hover:text-white">
              New In
            </Link>
            <Link href="/categories/accessories" className="text-rose-600 font-semibold transition-colors hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300">
              Sale
            </Link>
            <Link href="/about" className="transition-colors hover:text-black dark:hover:text-white">
              About Us
            </Link>
          </nav>
        </div>

        {/* Center: Search Bar */}
        <div className="hidden max-w-md flex-1 md:block">
          <HeaderSearch />
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-4 text-gray-700 text-xs font-medium dark:text-gray-300">
          <ThemeToggle />

          <UserAccountMenu />

          <WishlistCountBadge />

          <CartCountBadge />
        </div>
      </div>
    </header>
  );
}
