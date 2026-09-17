"use client";

import { useState, useMemo } from "react";
import { SlidersHorizontal, ChevronDown, Check } from "lucide-react";
import { ProductCard, type ProductCardData } from "./ProductCard";

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  count: number;
}

export interface CatalogProductVariant {
  size?: string;
  color?: string;
}

export interface CatalogProduct extends ProductCardData {
  categorySlug?: string;
  categoryName?: string;
  sizes?: string[];
  colors?: string[];
  variants?: CatalogProductVariant[];
}

interface CatalogBrowserProps {
  initialProducts: CatalogProduct[];
  categories: CategoryItem[];
  title?: string;
}

const AVAILABLE_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const AVAILABLE_COLORS = [
  { name: "Black", hex: "#111827" },
  { name: "White", hex: "#F3F4F6" },
  { name: "Navy", hex: "#1E3A8A" },
  { name: "Green", hex: "#059669" },
  { name: "Rust", hex: "#B45309" },
  { name: "Charcoal", hex: "#4B5563" },
];

export function matchesVariantSize(variantSize: string | undefined, selectedSizes: string[]): boolean {
  if (!variantSize || selectedSizes.length === 0) return false;
  const normalizedVariantSize = variantSize.trim().toLowerCase();
  return selectedSizes.some((selected) => {
    const normSelected = selected.trim().toLowerCase();
    if (normalizedVariantSize === normSelected) return true;
    const parts = normalizedVariantSize.split(/[\/\s,-]+/);
    return parts.includes(normSelected);
  });
}

export function matchesVariantColor(variantColor: string | undefined, selectedColors: string[]): boolean {
  if (!variantColor || selectedColors.length === 0) return false;
  const normalizedVariantColor = variantColor.trim().toLowerCase();
  return selectedColors.some((selected) => {
    return normalizedVariantColor === selected.trim().toLowerCase();
  });
}

export function CatalogBrowser({
  initialProducts,
  categories,
  title = "Clothing",
}: CatalogBrowserProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"featured" | "price-asc" | "price-desc" | "newest">("featured");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  function toggleSize(size: string) {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  }

  function toggleColor(colorName: string) {
    setSelectedColors((prev) =>
      prev.includes(colorName) ? prev.filter((c) => c !== colorName) : [...prev, colorName]
    );
  }

  const filteredProducts = useMemo(() => {
    let result = [...initialProducts];

    // Filter by Category
    if (selectedCategory !== "all") {
      result = result.filter(
        (p) => p.categorySlug === selectedCategory || p.categoryName?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Filter by Size & Color (Authoritative Source: p.variants[])
    if (selectedSizes.length > 0 && selectedColors.length > 0) {
      // Both Size and Color selected -> At least one actual variant must satisfy BOTH criteria simultaneously
      result = result.filter((p) =>
        (p.variants ?? []).some(
          (v) =>
            matchesVariantSize(v.size, selectedSizes) &&
            matchesVariantColor(v.color, selectedColors)
        )
      );
    } else if (selectedSizes.length > 0) {
      // Only Size selected -> At least one actual variant must satisfy Size
      result = result.filter((p) =>
        (p.variants ?? []).some((v) => matchesVariantSize(v.size, selectedSizes))
      );
    } else if (selectedColors.length > 0) {
      // Only Color selected -> At least one actual variant must satisfy Color
      result = result.filter((p) =>
        (p.variants ?? []).some((v) => matchesVariantColor(v.color, selectedColors))
      );
    }

    // Sort
    if (sortBy === "price-asc") {
      result.sort((a, b) => a.minPriceAmount - b.minPriceAmount);
    } else if (sortBy === "price-desc") {
      result.sort((a, b) => b.minPriceAmount - a.minPriceAmount);
    }

    return result;
  }, [initialProducts, selectedCategory, selectedSizes, selectedColors, sortBy]);


  return (
    <div id="catalog" className="scroll-mt-20">
      {/* Header bar */}
      <div className="flex flex-col gap-4 border-b border-gray-200 dark:border-ink-800 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-sans text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
            {title}
          </h2>
          <p className="mt-1 font-sans text-xs text-gray-500 dark:text-gray-400">
            {filteredProducts.length} {filteredProducts.length === 1 ? "product" : "products"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Sort Dropdown */}
          <div className="relative inline-flex items-center">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="appearance-none rounded-xl border border-gray-200 dark:border-ink-700 bg-white dark:bg-ink-900 py-2 pr-9 pl-3.5 text-xs font-medium text-gray-700 dark:text-gray-200 shadow-xs transition-colors hover:border-gray-300 dark:hover:border-ink-600 focus:border-black dark:focus:border-white focus:outline-none cursor-pointer"
            >
              <option value="featured">Sort: Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="newest">Newest First</option>
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-3 text-gray-400 dark:text-gray-500" />
          </div>

          {/* Filter Toggle on mobile */}
          <button
            type="button"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-ink-700 bg-white dark:bg-ink-900 px-3.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 shadow-xs hover:bg-gray-50 dark:hover:bg-ink-800 lg:hidden"
          >
            <SlidersHorizontal size={14} />
            <span>Filter</span>
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[220px_1fr]">
        {/* Left Sidebar Filter */}
        <aside className={`flex-col gap-8 ${showMobileFilters ? "flex" : "hidden lg:flex"}`}>
          {/* Categories */}
          <div>
            <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
              Categories
            </h3>
            <ul className="mt-3 space-y-1.5 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => setSelectedCategory("all")}
                  className={`w-full text-left py-1 text-xs transition-colors ${
                    selectedCategory === "all"
                      ? "font-semibold text-black dark:text-white"
                      : "text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
                  }`}
                >
                  All Clothing
                </button>
              </li>
              {categories.map((cat) => (
                <li key={cat.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(cat.slug)}
                    className={`flex w-full items-center justify-between py-1 text-left text-xs transition-colors ${
                      selectedCategory === cat.slug
                        ? "font-semibold text-black dark:text-white"
                        : "text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
                    }`}
                  >
                    <span>{cat.name}</span>
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 font-mono">{cat.count}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="h-px bg-gray-200 dark:bg-ink-800" />

          {/* Size Filter */}
          <div>
            <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
              Size
            </h3>
            <div className="mt-3 space-y-2">
              {AVAILABLE_SIZES.map((size) => {
                const checked = selectedSizes.includes(size);
                return (
                  <label
                    key={size}
                    className="flex items-center gap-2.5 text-xs text-gray-700 dark:text-gray-300 cursor-pointer select-none hover:text-black dark:hover:text-white"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSize(size)}
                      className="h-4 w-4 rounded border-gray-300 dark:border-ink-700 text-black focus:ring-black cursor-pointer"
                    />
                    <span>{size}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-gray-200 dark:bg-ink-800" />

          {/* Color Filter */}
          <div>
            <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
              Color
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {AVAILABLE_COLORS.map((c) => {
                const isSelected = selectedColors.includes(c.name);
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => toggleColor(c.name)}
                    title={c.name}
                    className={`relative flex h-6 w-6 items-center justify-center rounded-full border transition-all cursor-pointer ${
                      isSelected
                        ? "ring-2 ring-black dark:ring-white ring-offset-2 dark:ring-offset-ink-950 scale-110"
                        : "border-gray-300 dark:border-ink-700 hover:scale-105"
                    }`}
                    style={{ backgroundColor: c.hex }}
                  >
                    {isSelected && (
                      <Check
                        size={12}
                        className={c.name === "White" ? "text-black" : "text-white"}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {(selectedCategory !== "all" || selectedSizes.length > 0 || selectedColors.length > 0) && (
            <button
              type="button"
              onClick={() => {
                setSelectedCategory("all");
                setSelectedSizes([]);
                setSelectedColors([]);
              }}
              className="mt-2 text-left text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline"
            >
              Reset all filters
            </button>
          )}
        </aside>

        {/* Product Grid */}
        <div>
          {filteredProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 dark:border-ink-800 p-16 text-center">
              <p className="font-sans text-base font-medium text-gray-700 dark:text-gray-300">No products found</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Try changing your filters or category selection.</p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("all");
                  setSelectedSizes([]);
                  setSelectedColors([]);
                }}
                className="mt-4 inline-flex items-center rounded-full bg-black dark:bg-white px-4 py-2 text-xs font-medium text-white dark:text-black shadow-xs"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-3">
              {filteredProducts.map((product, idx) => (
                <ProductCard key={product.slug} product={product} priority={idx < 4} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
