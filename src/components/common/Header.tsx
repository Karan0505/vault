import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { CartCountBadge } from "@/components/cart/CartCountBadge";
import { WishlistCountBadge } from "@/components/wishlist/WishlistCountBadge";
import { HeaderSearch } from "./HeaderSearch";
import { UserAccountMenu } from "./UserAccountMenu";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-md transition-all">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-3.5">
        {/* Left: Brand Logo */}
        <div className="flex items-center gap-8">
          <Link href="/" className="group flex items-center gap-2.5">
            <span
              aria-hidden
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-black text-[14px] font-bold text-white shadow-sm transition-transform duration-300 group-hover:scale-105"
            >
              ∇
            </span>
            <span className="font-sans text-xl font-bold tracking-tight text-black">
              VAULT
            </span>
          </Link>

          {/* Nav links */}
          <nav className="hidden items-center gap-6 text-[13px] font-medium text-gray-700 md:flex">
            <Link href="/search" className="flex items-center gap-1 transition-colors hover:text-black font-semibold">
              <span>Shop</span>
              <ChevronDown size={13} className="text-gray-400" />
            </Link>
            <Link href="/categories/outerwear" className="transition-colors hover:text-black">
              Collections
            </Link>
            <Link href="/categories/footwear" className="transition-colors hover:text-black">
              New In
            </Link>
            <Link href="/categories/accessories" className="text-rose-600 font-semibold transition-colors hover:text-rose-700">
              Sale
            </Link>
            <Link href="/about" className="transition-colors hover:text-black">
              About Us
            </Link>
          </nav>
        </div>

        {/* Center: Search Bar */}
        <div className="hidden max-w-md flex-1 md:block">
          <HeaderSearch />
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-5 text-gray-700 text-xs font-medium">
          <UserAccountMenu />

          <WishlistCountBadge />

          <CartCountBadge />
        </div>
      </div>
    </header>
  );
}
