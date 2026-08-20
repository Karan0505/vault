import type { Metadata } from "next";
import { WishlistView } from "@/components/wishlist/WishlistView";

export const metadata: Metadata = {
  title: "Wishlist",
  description: "View and manage your saved VAULT collection items.",
};

export default function WishlistPage() {
  return (
    <div className="flex flex-col gap-6 py-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          Wishlist
        </h1>
        <p className="mt-1 font-mono text-xs text-gray-500">
          Your curated selection of saved pieces and favorites
        </p>
      </div>

      <WishlistView />
    </div>
  );
}
