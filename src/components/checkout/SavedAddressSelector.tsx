
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Check, CheckCircle2, Home, Briefcase, Building, MapPin, AlertCircle } from "lucide-react";
import type { AddressItem } from "@/components/account/AddressManager";

interface SavedAddressSelectorProps {
  selectedAddressId: string | null;
  onSelectAddress: (address: AddressItem) => void;
  onAddressListLoaded?: (addresses: AddressItem[]) => void;
}

export function SavedAddressSelector({
  selectedAddressId,
  onSelectAddress,
  onAddressListLoaded,
}: SavedAddressSelectorProps) {
  const router = useRouter();
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const onAddressListLoadedRef = useRef(onAddressListLoaded);
  useEffect(() => {
    onAddressListLoadedRef.current = onAddressListLoaded;
  }, [onAddressListLoaded]);

  const fetchAddresses = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      setError(null);
      const res = await fetch("/api/account/addresses");
      if (!res.ok) {
        if (res.status === 401) {
          setAddresses([]);
          onAddressListLoadedRef.current?.([]);
          return;
        }
        throw new Error("Unable to load your saved addresses. Please try again.");
      }
      const data = await res.json();
      const list: AddressItem[] = data.addresses || [];
      setAddresses(list);

      onAddressListLoadedRef.current?.(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load your saved addresses. Please try again.");
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAddresses(true);
  }, [fetchAddresses]);

  const getLabelIcon = (label: string) => {
    const l = label.toLowerCase();
    if (l === "home") return <Home size={12} className="text-gray-600" />;
    if (l === "work" || l === "office") return <Briefcase size={12} className="text-gray-600" />;
    if (l === "warehouse") return <Building size={12} className="text-gray-600" />;
    return <MapPin size={12} className="text-gray-600" />;
  };

  if (loading) {
    return (
      <div className="mb-6 space-y-3">
        <div className="h-4 w-40 rounded-sm bg-gray-100 animate-pulse" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="h-28 rounded-2xl border border-gray-100 bg-gray-50/50 p-4 animate-pulse" />
          <div className="h-28 rounded-2xl border border-gray-100 bg-gray-50/50 p-4 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-xs text-rose-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchAddresses}
            className="font-bold underline hover:text-rose-950"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // 0 Saved Addresses — Dedicated Empty State
  if (addresses.length === 0) {
    return (
      <div className="mb-6 rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-400">
          <MapPin size={18} />
        </div>
        <p className="mt-3 text-xs font-bold text-gray-900">
          No delivery address saved yet.
        </p>
        <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
          Add your first address and then continue to buy this item.
        </p>
        <button
          type="button"
          onClick={() => router.push("/account?tab=addresses")}
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-black px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-neutral-800 transition-colors"
        >
          <Plus size={13} />
          <span>Add New Address</span>
        </button>
      </div>
    );
  }

  // 1+ Saved Addresses — Selectable Radio Card Grid
  return (
    <div className="mb-6 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900">
            Select a delivery address
          </h4>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Choose exactly one destination for this order
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/account?tab=addresses")}
          className="inline-flex items-center gap-1 text-xs font-bold text-black hover:underline"
        >
          <Plus size={13} />
          <span>+ Add New Address</span>
        </button>
      </div>

      <div
        role="radiogroup"
        aria-label="Saved delivery addresses"
        className="grid gap-3 sm:grid-cols-2"
      >
        {addresses.map((addr) => {
          const isSelected = selectedAddressId === addr.id;

          return (
            <label
              key={addr.id}
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  onSelectAddress(addr);
                }
              }}
              onClick={() => onSelectAddress(addr)}
              className={`relative flex cursor-pointer flex-col justify-between rounded-2xl border p-4 transition-all text-xs focus:outline-hidden bg-white ${
                isSelected
                  ? "border-black ring-2 ring-black/10 shadow-xs"
                  : "border-slate-200 hover:border-slate-300 shadow-xs"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    {/* Custom Radio Button Indicator */}
                    <div
                      className={`flex h-4 w-4 items-center justify-center rounded-full border transition-colors ${
                        isSelected ? "border-black bg-black text-white" : "border-gray-300 bg-white"
                      }`}
                    >
                      {isSelected && <Check size={10} strokeWidth={3} />}
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-800">
                      {getLabelIcon(addr.label)}
                      <span className="font-bold uppercase tracking-wider text-xs">
                        {addr.label}
                      </span>
                    </div>
                  </div>

                  {addr.isDefault && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-300 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700">
                      <CheckCircle2 size={10} className="text-emerald-600" />
                      DEFAULT
                    </span>
                  )}
                </div>

                <div className="mt-2.5 space-y-0.5 text-gray-700">
                  <p className="font-bold text-gray-900 text-xs">{addr.fullName}</p>
                  <p className="text-gray-600 leading-tight">
                    {addr.address}
                    {addr.apartment ? `, ${addr.apartment}` : ""}
                  </p>
                  <p className="text-gray-600">
                    {addr.city}, {addr.state} {addr.zip}
                  </p>
                  <p className="text-[11px] text-gray-500 font-medium">{addr.country}</p>
                  {addr.phone && (
                    <p className="text-[10px] text-gray-400 font-mono mt-1">
                      Phone: {addr.phone}
                    </p>
                  )}
                </div>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
