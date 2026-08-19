import Link from "next/link";
import { Instagram, Facebook, Twitter } from "lucide-react";

export function Footer() {
  const shopLinks = [
    { label: "All Products", href: "/search" },
    { label: "New Arrivals", href: "/search" },
    { label: "Best Sellers", href: "/search" },
    { label: "Sale", href: "/search" },
    { label: "Gift Cards", href: "/search" },
  ];

  const collectionLinks = [
    { label: "Clothing", href: "/search" },
    { label: "Shoes", href: "/categories/footwear" },
    { label: "Accessories", href: "/categories/accessories" },
    { label: "Bags", href: "/categories/accessories" },
    { label: "Summer Collection", href: "/search" },
  ];

  const customerLinks = [
    { label: "Contact Us", href: "/about" },
    { label: "Shipping & Delivery", href: "/about" },
    { label: "Returns & Exchanges", href: "/about" },
    { label: "FAQs", href: "/about" },
    { label: "Size Guide", href: "/about" },
  ];

  const companyLinks = [
    { label: "About Us", href: "/about" },
    { label: "Our Values", href: "/about" },
    { label: "Sustainability", href: "/about" },
    { label: "Careers", href: "/about" },
    { label: "Press", href: "/about" },
  ];

  return (
    <footer className="mt-16 border-t border-gray-200 bg-white pt-12 pb-8 text-gray-600 font-sans text-xs">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-6 pb-12 border-b border-gray-200">
          {/* Brand Col */}
          <div className="flex flex-col items-start gap-4 sm:col-span-2">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-black text-[12px] font-bold text-white">
                ∇
              </span>
              <span className="font-sans text-lg font-bold tracking-tight text-black">
                VAULT
              </span>
            </Link>
            <p className="max-w-xs text-gray-500 leading-relaxed text-xs">
              Timeless style. Premium quality. Built for life.
            </p>

            <div className="flex items-center gap-3 text-gray-500 pt-1">
              <Link href="#" className="hover:text-black transition-colors">
                <Instagram size={17} />
              </Link>
              <Link href="#" className="hover:text-black transition-colors">
                <Facebook size={17} />
              </Link>
              <Link href="#" className="hover:text-black transition-colors">
                <Twitter size={17} />
              </Link>
            </div>
          </div>

          {/* Shop */}
          <div className="flex flex-col gap-3">
            <h4 className="font-bold uppercase tracking-wider text-gray-900 text-[11px]">Shop</h4>
            <ul className="space-y-2">
              {shopLinks.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="hover:text-black transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Collections */}
          <div className="flex flex-col gap-3">
            <h4 className="font-bold uppercase tracking-wider text-gray-900 text-[11px]">Collections</h4>
            <ul className="space-y-2">
              {collectionLinks.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="hover:text-black transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Care */}
          <div className="flex flex-col gap-3">
            <h4 className="font-bold uppercase tracking-wider text-gray-900 text-[11px]">Customer Care</h4>
            <ul className="space-y-2">
              {customerLinks.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="hover:text-black transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div className="flex flex-col gap-3">
            <h4 className="font-bold uppercase tracking-wider text-gray-900 text-[11px]">Company</h4>
            <ul className="space-y-2">
              {companyLinks.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="hover:text-black transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar with payment icons & copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 text-[11px] text-gray-500">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-gray-700">Secure Payments</span>
            <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold">
              <span className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-blue-700">VISA</span>
              <span className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-red-600">MC</span>
              <span className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-sky-600">AMEX</span>
              <span className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-blue-600">PayPal</span>
              <span className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-black"> Pay</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <span>© 2024 VAULT. All rights reserved.</span>
            <div className="flex items-center gap-3">
              <Link href="#" className="hover:underline">Privacy Policy</Link>
              <span>·</span>
              <Link href="#" className="hover:underline">Terms of Service</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
