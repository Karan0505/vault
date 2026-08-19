import type { Metadata } from "next";
import {
  HeroSection,
  TrustBar,
  ShopByCategory,
  BestSellers,
  PromoBanners,
  WhyShopWithVault,
  CustomerReviews,
  NewsletterSection,
} from "@/components/home";

export const metadata: Metadata = {
  title: "VAULT — Designed for Life. Built to Last.",
  description: "Premium materials. Timeless design. Fast shipping. Easy returns.",
};

export const revalidate = 60; // Tag-based revalidation

export default function HomePage() {
  return (
    <div className="flex flex-col gap-14 sm:gap-20">
      {/* 1. Hero Showcase */}
      <HeroSection />

      {/* 2. Trust Bar */}
      <TrustBar />

      {/* 3. Shop by Category */}
      <ShopByCategory />

      {/* 4. Best Sellers */}
      <BestSellers />

      {/* 5. Promotional 3-Banner Cards */}
      <PromoBanners />

      {/* 6. Why Shop With VAULT */}
      <WhyShopWithVault />

      {/* 7. What Our Customers Say (Testimonials) */}
      <CustomerReviews />

      {/* 8. Newsletter Email Capture */}
      <NewsletterSection />
    </div>
  );
}
