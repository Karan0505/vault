"use client";

import { useState } from "react";
import Image from "next/image";
import { UploadButton } from "@/lib/uploads/uploadthing-components";
import { GripVertical, X } from "lucide-react";

export interface MediaDraft {
  url: string;
  alt: string;
}

interface ImageUploaderProps {
  images: MediaDraft[];
  onChange: (images: MediaDraft[]) => void;
}

export function ImageUploader({ images, onChange }: ImageUploaderProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function reorder(from: number, to: number) {
    const next = [...images];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    onChange(next);
  }

  function removeAt(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  function updateAlt(index: number, alt: string) {
    onChange(images.map((img, i) => (i === index ? { ...img, alt } : img)));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {images.map((image, index) => (
          <div
            key={image.url}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex !== null && dragIndex !== index) reorder(dragIndex, index);
              setDragIndex(null);
            }}
            className="group relative aspect-square overflow-hidden rounded-lg border border-ink-700 bg-ink-800"
          >
            <Image src={image.url} alt={image.alt} fill sizes="150px" className="object-cover" />
            <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-ink-950/80 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
              <GripVertical size={14} className="cursor-grab text-ink-200" />
              <button
                type="button"
                onClick={() => removeAt(index)}
                aria-label="Remove image"
                className="rounded-full bg-ink-950/70 p-1 text-ink-200 hover:text-signal-red"
              >
                <X size={12} />
              </button>
            </div>
            <input
              value={image.alt}
              onChange={(e) => updateAlt(index, e.target.value)}
              placeholder="Alt text"
              className="absolute inset-x-0 bottom-0 w-full bg-ink-950/85 px-2 py-1 text-[11px] text-ink-200 placeholder:text-ink-600 focus:outline-none"
            />
            {index === 0 && (
              <span className="absolute left-1.5 top-1.5 rounded-full bg-brass-400 px-1.5 py-0.5 text-[9px] font-mono uppercase text-ink-950">
                Cover
              </span>
            )}
          </div>
        ))}

        <UploadButton
          endpoint="productImage"
          onClientUploadComplete={(res) => {
            const uploaded = res.map((file) => ({ url: file.url, alt: "" }));
            onChange([...images, ...uploaded]);
          }}
          onUploadError={(error: Error) => {
            // Surfaced inline rather than a toast — Phase 1 has no toast system yet.
            console.error("Upload failed", error);
          }}
          appearance={{
            container: "aspect-square",
            button:
              "flex h-full w-full items-center justify-center rounded-lg border border-dashed border-ink-600 bg-ink-900 text-xs text-ink-400 hover:border-brass-400 hover:text-brass-300",
            allowedContent: "hidden",
          }}
          content={{ button: "Add image" }}
        />
      </div>
      <p className="text-xs text-ink-600">
        Drag to reorder. The first image is the storefront cover and card thumbnail.
      </p>
    </div>
  );
}
