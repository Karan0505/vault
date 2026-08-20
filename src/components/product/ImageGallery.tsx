"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/shared/utils";

export interface GalleryImage {
  url: string;
  alt: string;
}

export function ImageGallery({ images, productTitle }: { images: GalleryImage[]; productTitle: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = images[activeIndex];

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-gray-100 border border-gray-200/80 shadow-xs">
        <AnimatePresence mode="wait" initial={false}>
          {active ? (
            <motion.div
              key={active.url}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0"
            >
              <Image
                src={active.url}
                alt={active.alt || productTitle}
                fill
                priority
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover"
              />
            </motion.div>
          ) : (
            <div className="skeleton absolute inset-0" />
          )}
        </AnimatePresence>
      </div>

      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <button
              key={image.url}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Show image ${index + 1} of ${images.length}`}
              aria-current={index === activeIndex}
              className={cn(
                "relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border transition-all",
                index === activeIndex
                  ? "border-black ring-2 ring-black/10 scale-95"
                  : "border-gray-200 hover:border-gray-400 opacity-70 hover:opacity-100"
              )}
            >
              <Image src={image.url} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
