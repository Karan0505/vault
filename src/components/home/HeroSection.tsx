import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";

export function HeroSection() {
  const avatars = [
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces",
  ];

  return (
    <section className="relative overflow-hidden rounded-3xl bg-[#F4F4F5]/80 border border-gray-200/80 p-8 sm:p-12 lg:p-14">
      <div className="grid items-center gap-12 lg:grid-cols-12">
        {/* Left copy & CTAs */}
        <div className="flex flex-col items-start lg:col-span-6">
          <span className="font-sans text-xs font-bold uppercase tracking-wider text-indigo-600">
            NEW ARRIVALS
          </span>

          <h1 className="mt-4 font-sans text-4xl font-extrabold tracking-tight text-gray-950 sm:text-5xl lg:text-6xl leading-[1.08]">
            Designed for life.<br />
            Built to last.
          </h1>

          <p className="mt-4 max-w-md text-sm text-gray-600 leading-relaxed font-sans">
            Premium materials. Timeless design.<br className="hidden sm:inline" />
            Fast shipping. Easy returns.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/search"
              className="inline-flex items-center justify-center rounded-full bg-black px-6 py-3 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:bg-neutral-800 active:scale-[0.98]"
            >
              Shop New Arrivals
            </Link>
            <Link
              href="/categories/outerwear"
              className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-6 py-3 text-xs font-semibold text-gray-800 shadow-2xs transition-all duration-200 hover:bg-gray-50 hover:border-gray-400 active:scale-[0.98]"
            >
              Explore Collections
            </Link>
          </div>

          {/* Social Proof */}
          <div className="mt-8 flex items-center gap-3">
            <div className="flex -space-x-2 overflow-hidden">
              {avatars.map((img, i) => (
                <div
                  key={i}
                  className="relative h-7 w-7 overflow-hidden rounded-full ring-2 ring-white"
                >
                  <Image src={img} alt="Happy customer" fill className="object-cover" />
                </div>
              ))}
            </div>
            <div className="flex flex-col text-left">
              <span className="font-sans text-xs font-semibold text-gray-800">
                Join 10,000+ happy customers
              </span>
              <div className="flex items-center gap-1 text-[11px] text-amber-500 font-semibold">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={11} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-gray-700 ml-0.5">4.9/5</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Hero Image */}
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-white shadow-md lg:col-span-6 border border-gray-200/60">
          <Image
            src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1200&q=80"
            alt="VAULT Scandinavian Interior"
            fill
            priority
            className="object-cover transition-transform duration-700 hover:scale-105"
            sizes="(min-width: 1024px) 50vw, 100vw"
          />
        </div>
      </div>

      {/* Carousel dots indicator */}
      <div className="mt-6 flex justify-center items-center gap-1.5">
        <span className="h-1.5 w-5 rounded-full bg-black" />
        <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
        <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
      </div>
    </section>
  );
}
