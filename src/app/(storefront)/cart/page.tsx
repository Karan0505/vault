import type { Metadata } from "next";
import { CartPageBody } from "@/components/cart/CartPageBody";

export const metadata: Metadata = { title: "Your cart" };

export default function CartPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="eyebrow">Cart</p>
        <h1 className="mt-2 font-display text-3xl italic text-ink-50">Your cart</h1>
      </div>
      <CartPageBody />
    </div>
  );
}
