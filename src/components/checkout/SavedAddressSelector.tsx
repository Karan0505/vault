"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Check, Home, Briefcase, Building, MapPin, Loader2, X } from "lucide-react";
import type { AddressInput } from "@/lib/validation/validation";
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
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inline Add Address Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<AddressInput>({
    label: "Home",
    fullName: "",
    address: "",
    apartment: "",
    city: "",
    state: "",
    zip: "",
    country: "United States",
    phone: "",
    isDefault: false,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const fetchAddresses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/account/addresses");
      if (!res.ok) {
        if (res.status === 401) {
          // Guest or unauthenticated
          setAddresses([]);
          return;
        }
        throw new Error("Failed to load saved addresses");
      }
      const data = await res.json();
      const list: AddressItem[] = data.addresses || [];
      setAddresses(list);

      if (onAddressListLoaded) {
        onAddressListLoaded(list);
      }

      // Default selection logic:
      // 1. If an address is marked default, select it.
      // 2. Otherwise, if exactly one address exists, select it.
      if (!selectedAddressId && list.length > 0) {
        const defaultAddr = list.find((a) => a.isDefault);
        if (defaultAddr) {
          onSelectAddress(defaultAddr);
        } else if (list[0]) {
          onSelectAddress(list[0]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load addresses");
    } finally {
      setLoading(false);
    }
  }, [onAddressListLoaded, onSelectAddress, selectedAddressId]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const openAddModal = () => {
    setFormData({
      label: "Home",
      fullName: "",
      address: "",
      apartment: "",
      city: "",
      state: "",
      zip: "",
      country: "United States",
      phone: "",
      isDefault: addresses.length === 0,
    });
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setFormErrors({});
  };

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!formData.fullName.trim()) errs.fullName = "Full name is required";
    if (!formData.address.trim()) errs.address = "Street address is required";
    if (!formData.city.trim()) errs.city = "City is required";
    if (!formData.state.trim()) errs.state = "State is required";
    if (!formData.zip.trim()) errs.zip = "ZIP/Postal code is required";
    if (!formData.country.trim()) errs.country = "Country is required";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveNewAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || saving) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/account/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create address");
      }

      const data = await res.json();
      const newAddress: AddressItem = data.address;

      setAddresses((prev) => {
        const updated = newAddress.isDefault
          ? prev.map((a) => ({ ...a, isDefault: false }))
          : [...prev];
        return [newAddress, ...updated];
      });

      // Instantly select the newly created address without page reload
      onSelectAddress(newAddress);
      closeAddModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create address");
    } finally {
      setSaving(false);
    }
  };

  const getLabelIcon = (label: string) => {
    const l = label.toLowerCase();
    if (l === "home") return <Home size={12} className="text-gray-600" />;
    if (l === "work" || l === "office") return <Briefcase size={12} className="text-gray-600" />;
    if (l === "warehouse") return <Building size={12} className="text-gray-600" />;
    return <MapPin size={12} className="text-gray-600" />;
  };

  if (loading) {
    return (
      <div className="mb-6 rounded-2xl border border-gray-200 bg-gray-50/50 p-4">
        <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
          <Loader2 size={14} className="animate-spin text-black" />
          <span>Loading your saved addresses...</span>
        </div>
      </div>
    );
  }

  if (addresses.length === 0) {
    // If customer has no saved addresses, return null or an inline prompt
    return null;
  }

  return (
    <div className="mb-8 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">
            Select Delivery Address
          </h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Choose from your saved addresses or add a new one
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-1 text-xs font-bold text-black hover:underline"
        >
          <Plus size={13} />
          <span>+ Add New Address</span>
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800">
          {error}
        </div>
      )}

      {/* Flipkart-Style Radio Card Grid */}
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
              className={`relative flex cursor-pointer flex-col justify-between rounded-2xl border p-3.5 transition-all text-xs focus:outline-none ${
                isSelected
                  ? "border-black bg-gray-50/90 ring-2 ring-black/10 shadow-xs"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    {/* Custom Radio Circle */}
                    <div
                      className={`flex h-4 w-4 items-center justify-center rounded-full border transition-colors ${
                        isSelected ? "border-black bg-black text-white" : "border-gray-300 bg-white"
                      }`}
                    >
                      {isSelected && <Check size={10} strokeWidth={3} />}
                    </div>

                    <div className="flex items-center gap-1">
                      {getLabelIcon(addr.label)}
                      <span className="font-bold uppercase tracking-wider text-[11px] text-gray-800">
                        {addr.label}
                      </span>
                    </div>
                  </div>

                  {addr.isDefault && (
                    <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-800">
                      Default
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

      {/* Add New Address Modal inside Checkout */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="checkout-address-modal-title"
        >
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={closeAddModal}
              className="absolute right-5 top-5 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>

            <h3 id="checkout-address-modal-title" className="text-base font-bold text-gray-900">
              Add New Delivery Address
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Enter address details. It will be saved and selected for this checkout.
            </p>

            <form onSubmit={handleSaveNewAddress} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1.5">
                  Address Type / Label
                </label>
                <div className="flex gap-2">
                  {["Home", "Work", "Office", "Other"].map((lbl) => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, label: lbl }))}
                      className={`flex-1 rounded-xl border py-2 text-xs font-semibold transition-colors ${
                        formData.label === lbl
                          ? "border-black bg-black text-white"
                          : "border-gray-200 bg-gray-50/50 text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Recipient Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, fullName: e.target.value }))
                  }
                  placeholder="e.g. Max Parmar"
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-xs text-gray-900 focus:outline-none ${
                    formErrors.fullName
                      ? "border-rose-300 bg-rose-50/50"
                      : "border-gray-200 bg-gray-50/70 focus:border-black focus:bg-white"
                  }`}
                />
                {formErrors.fullName && (
                  <p className="mt-1 text-[11px] text-rose-600">{formErrors.fullName}</p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Street Address *
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, address: e.target.value }))
                  }
                  placeholder="e.g. 123 Main Street"
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-xs text-gray-900 focus:outline-none ${
                    formErrors.address
                      ? "border-rose-300 bg-rose-50/50"
                      : "border-gray-200 bg-gray-50/70 focus:border-black focus:bg-white"
                  }`}
                />
                {formErrors.address && (
                  <p className="mt-1 text-[11px] text-rose-600">{formErrors.address}</p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Apartment, suite, unit (optional)
                </label>
                <input
                  type="text"
                  value={formData.apartment || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, apartment: e.target.value }))
                  }
                  placeholder="e.g. Apt 4B"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/70 px-3.5 py-2.5 text-xs text-gray-900 focus:border-black focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, city: e.target.value }))
                    }
                    placeholder="San Francisco"
                    className={`w-full rounded-xl border px-3 py-2.5 text-xs text-gray-900 focus:outline-none ${
                      formErrors.city
                        ? "border-rose-300 bg-rose-50/50"
                        : "border-gray-200 bg-gray-50/70 focus:border-black focus:bg-white"
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">State *</label>
                  <input
                    type="text"
                    required
                    value={formData.state}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, state: e.target.value }))
                    }
                    placeholder="CA"
                    className={`w-full rounded-xl border px-3 py-2.5 text-xs text-gray-900 focus:outline-none ${
                      formErrors.state
                        ? "border-rose-300 bg-rose-50/50"
                        : "border-gray-200 bg-gray-50/70 focus:border-black focus:bg-white"
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">ZIP *</label>
                  <input
                    type="text"
                    required
                    value={formData.zip}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, zip: e.target.value }))
                    }
                    placeholder="94103"
                    className={`w-full rounded-xl border px-3 py-2.5 text-xs text-gray-900 focus:outline-none ${
                      formErrors.zip
                        ? "border-rose-300 bg-rose-50/50"
                        : "border-gray-200 bg-gray-50/70 focus:border-black focus:bg-white"
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Country *</label>
                  <select
                    value={formData.country}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, country: e.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/70 px-3.5 py-2.5 text-xs text-gray-900 focus:border-black focus:bg-white focus:outline-none"
                  >
                    <option value="United States">United States</option>
                    <option value="Canada">Canada</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="India">India</option>
                    <option value="Australia">Australia</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    placeholder="+1 (555) 000-0000"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/70 px-3.5 py-2.5 text-xs text-gray-900 focus:border-black focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeAddModal}
                  disabled={saving}
                  className="rounded-full border border-gray-200 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-2 font-semibold text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {saving && <Loader2 size={13} className="animate-spin" />}
                  <span>Save and Select</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
