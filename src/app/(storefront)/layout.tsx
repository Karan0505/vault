import { TopAnnouncementBar, Header, Footer } from "@/components/common";
import { CartDrawerProvider, CartDrawer } from "@/components/cart";

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartDrawerProvider>
      <div className="flex min-h-screen flex-col bg-white">
        <TopAnnouncementBar />
        <Header />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 py-6 sm:py-8">{children}</main>
        <Footer />
      </div>
      <CartDrawer />
    </CartDrawerProvider>
  );
}
