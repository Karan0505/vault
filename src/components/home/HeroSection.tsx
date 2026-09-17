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
    <section className="relative overflow-hidden rounded-3xl bg-[#F4F4F5]/80 dark:bg-ink-900/70 border border-gray-200/80 dark:border-ink-800 p-8 sm:p-12 lg:p-14">
      <div className="grid items-center gap-12 lg:grid-cols-12">
        {/* Left copy & CTAs */}
        <div className="flex flex-col items-start lg:col-span-6">
          <span className="font-sans text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            NEW ARRIVALS
          </span>

          <h1 className="mt-4 font-sans text-4xl font-extrabold tracking-tight text-gray-950 dark:text-white sm:text-5xl lg:text-6xl leading-[1.08]">
            Designed for life.<br />
            Built to last.
          </h1>

          <p className="mt-4 max-w-md text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-sans">
            Premium materials. Timeless design.<br className="hidden sm:inline" />
            Fast shipping. Easy returns.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/search"
              className="inline-flex items-center justify-center rounded-full bg-black dark:bg-white px-6 py-3 text-xs font-semibold text-white dark:text-black shadow-sm transition-all duration-200 hover:bg-neutral-800 dark:hover:bg-neutral-200 active:scale-[0.98]"
            >
              Shop New Arrivals
            </Link>
            <Link
              href="/categories/outerwear"
              className="inline-flex items-center justify-center rounded-full border border-gray-300 dark:border-ink-700 bg-white dark:bg-ink-900 px-6 py-3 text-xs font-semibold text-gray-800 dark:text-gray-100 shadow-2xs transition-all duration-200 hover:bg-gray-50 dark:hover:bg-ink-800 hover:border-gray-400 dark:hover:border-ink-600 active:scale-[0.98]"
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
                  className="relative h-7 w-7 overflow-hidden rounded-full ring-2 ring-white dark:ring-ink-900"
                >
                  <Image src={img} alt="Happy customer" fill sizes="28px" className="object-cover" />
                </div>
              ))}
            </div>
            <div className="flex flex-col text-left">
              <span className="font-sans text-xs font-semibold text-gray-800 dark:text-gray-200">
                Join 10,000+ happy customers
              </span>
              <div className="flex items-center gap-1 text-[11px] text-amber-500 font-semibold">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={11} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-gray-700 dark:text-gray-300 ml-0.5">4.9/5</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Hero Image */}
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-white dark:bg-ink-900 shadow-md lg:col-span-6 border border-gray-200/60 dark:border-ink-800">
          <Image
            src="/images/hero-couch.webp"
            alt="VAULT Scandinavian Interior"
            fill
            priority
            fetchPriority="high"
            className="object-cover transition-transform hover:scale-105"
            quality={75}
            sizes="(max-width: 768px) 92vw, (max-width: 1200px) 50vw, 600px"
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
