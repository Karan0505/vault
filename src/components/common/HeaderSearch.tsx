"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export function HeaderSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push("/search");
    }
  }

  function handleClick() {
    router.push("/search");
  }

  return (
    <form onSubmit={handleSubmit} className="relative group w-full">
      <Search
        size={16}
        className="absolute top-1/2 left-3.5 -translate-y-1/2 text-gray-400 group-hover:text-black transition-colors pointer-events-none"
      />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onClick={handleClick}
        placeholder="Search products, collections..."
        className="w-full rounded-full border border-gray-200 bg-gray-50/80 py-2.5 pr-4 pl-9 text-xs text-gray-900 placeholder:text-gray-400 transition-all hover:bg-white hover:border-gray-300 focus:border-black focus:bg-white focus:outline-none shadow-2xs cursor-pointer"
      />
    </form>
  );
}
