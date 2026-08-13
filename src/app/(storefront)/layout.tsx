import { Header } from "@/components/storefront/Header";
import { Footer } from "@/components/storefront/Footer";
import { CartDrawerProvider } from "@/components/cart/CartDrawerContext";
import { CartDrawer } from "@/components/cart/CartDrawer";

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartDrawerProvider>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10">{children}</main>
        <Footer />
      </div>
      <CartDrawer />
    </CartDrawerProvider>
  );
}
