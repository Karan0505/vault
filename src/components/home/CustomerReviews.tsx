import Image from "next/image";
import Link from "next/link";
import { Star, ArrowRight } from "lucide-react";

export function CustomerReviews() {
  const reviews = [
    {
      name: "James Carter",
      role: "Verified Buyer",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=faces",
      quote:
        "The quality is incredible. Everything fits perfectly and the materials feel premium. Shipping was super fast too!",
      rating: 5,
    },
    {
      name: "Sophia Miller",
      role: "Verified Buyer",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&crop=faces",
      quote:
        "VAULT has become my go-to store. Clean designs, great prices, and the customer service is outstanding.",
      rating: 5,
    },
    {
      name: "Daniel Lee",
      role: "Verified Buyer",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&crop=faces",
      quote:
        "Love the minimalist aesthetic and attention to detail. The hoodie I bought is my favorite piece now.",
      rating: 5,
    },
  ];

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="font-sans text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
          What Our Customers Say
        </h2>
        <Link
          href="/search"
          className="group inline-flex items-center gap-1 font-sans text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          <span>View all reviews</span>
          <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        {reviews.map((r, idx) => (
          <div
            key={idx}
            className="flex flex-col justify-between rounded-2xl border border-gray-200/80 bg-white p-6 shadow-2xs transition-all hover:border-gray-300 hover:shadow-sm"
          >
            <div>
              {/* Rating stars */}
              <div className="flex items-center gap-0.5 text-amber-400">
                {[...Array(r.rating)].map((_, i) => (
                  <Star key={i} size={13} className="fill-amber-400" />
                ))}
              </div>

              <p className="mt-4 font-sans text-xs text-gray-700 leading-relaxed italic">
                “{r.quote}”
              </p>
            </div>

            <div className="mt-6 flex items-center gap-3 border-t border-gray-100 pt-4">
              <div className="relative h-9 w-9 overflow-hidden rounded-full border border-gray-200">
                <Image src={r.avatar} alt={r.name} fill className="object-cover" />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-sans text-xs font-bold text-gray-900">{r.name}</span>
                <span className="font-sans text-[10px] text-gray-500">{r.role}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
