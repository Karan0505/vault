"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Edit2, Trash2, CheckCircle2, Home, Briefcase, Building, MapPin, X, Loader2 } from "lucide-react";
import type { AddressInput } from "@/lib/validation/validation";

export interface AddressItem {
  id: string;
  userId: string;
  label: string;
  fullName: string;
  address: string;
  apartment?: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string | null;
  isDefault: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface AddressManagerProps {
  initialAddresses?: AddressItem[];
  onAddressSelect?: (address: AddressItem) => void;
  selectedAddressId?: string;
  isSelectable?: boolean;
}

export function AddressManager({
  initialAddresses,
  onAddressSelect,
  selectedAddressId,
  isSelectable = false,
}: AddressManagerProps) {
  const [addresses, setAddresses] = useState<AddressItem[]>(initialAddresses || []);
  const [loading, setLoading] = useState(!initialAddresses);
  const [error, setError] = useState<string | null>(null);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<AddressItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  // Form Fields
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
        throw new Error("Failed to load saved addresses");
      }
      const data = await res.json();
      setAddresses(data.addresses || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading addresses");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialAddresses) {
      fetchAddresses();
    }
  }, [initialAddresses, fetchAddresses]);

  const openAddModal = () => {
    setEditingAddress(null);
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
    setIsModalOpen(true);
  };

  const openEditModal = (addr: AddressItem) => {
    setEditingAddress(addr);
    setFormData({
      label: addr.label || "Home",
      fullName: addr.fullName,
      address: addr.address,
      apartment: addr.apartment || "",
      city: addr.city,
      state: addr.state,
      zip: addr.zip,
      country: addr.country || "United States",
      phone: addr.phone || "",
      isDefault: addr.isDefault,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAddress(null);
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

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || saving) return;

    setSaving(true);
    setError(null);

    try {
      const url = editingAddress
        ? `/api/account/addresses/${editingAddress.id}`
        : "/api/account/addresses";
      const method = editingAddress ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save address");
      }

      const savedData = await res.json();
      const savedAddress: AddressItem = savedData.address;

      if (editingAddress) {
        setAddresses((prev) =>
          prev.map((a) => {
            if (a.id === savedAddress.id) return savedAddress;
            if (savedAddress.isDefault) return { ...a, isDefault: false };
            return a;
          })
        );
      } else {
        setAddresses((prev) => {
          const updated = savedAddress.isDefault
            ? prev.map((a) => ({ ...a, isDefault: false }))
            : [...prev];
          return [savedAddress, ...updated];
        });
        if (onAddressSelect) {
          onAddressSelect(savedAddress);
        }
      }

      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save address");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (actionInProgressId || !window.confirm("Are you sure you want to delete this address?")) return;

    setActionInProgressId(addressId);
    try {
      const res = await fetch(`/api/account/addresses/${addressId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete address");
      }

      // Re-fetch to get updated default state correctly
      await fetchAddresses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete address");
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleSetDefault = async (addressId: string) => {
    if (actionInProgressId) return;

    setActionInProgressId(addressId);
    try {
      const res = await fetch(`/api/account/addresses/${addressId}/default`, {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Failed to set default address");
      }

      setAddresses((prev) =>
        prev.map((a) => ({
          ...a,
          isDefault: a.id === addressId,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set default address");
    } finally {
      setActionInProgressId(null);
    }
  };

  const getLabelIcon = (label: string) => {
    const l = label.toLowerCase();
    if (l === "home") return <Home size={13} className="text-gray-600" />;
    if (l === "work" || l === "office") return <Briefcase size={13} className="text-gray-600" />;
    if (l === "warehouse") return <Building size={13} className="text-gray-600" />;
    return <MapPin size={13} className="text-gray-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Header & Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900">
            Saved Addresses
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage your delivery destinations for faster checkout
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-1.5 rounded-full bg-black px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-gray-800 transition-colors"
        >
          <Plus size={14} />
          <span>Add New Address</span>
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-800">
          {error}
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((n) => (
            <div key={n} className="h-40 rounded-2xl border border-gray-100 bg-gray-50/50 p-4 animate-pulse" />
          ))}
        </div>
      ) : addresses.length === 0 ? (
        /* Empty State */
        <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center bg-gray-50/50">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-400">
            <MapPin size={18} />
          </div>
          <p className="mt-3 text-xs font-bold text-gray-800">No saved addresses yet</p>
          <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
            Save delivery addresses to speed up your checkout process on future orders.
          </p>
          <button
            type="button"
            onClick={openAddModal}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800 transition-colors"
          >
            <Plus size={13} />
            <span>Add your first address</span>
          </button>
        </div>
      ) : (
        /* Address Cards Grid */
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((addr) => {
            const isSelected = isSelectable && selectedAddressId === addr.id;
            return (
              <div
                key={addr.id}
                role={isSelectable ? "radio" : undefined}
                aria-checked={isSelectable ? isSelected : undefined}
                tabIndex={isSelectable ? 0 : undefined}
                onClick={() => {
                  if (isSelectable && onAddressSelect) {
                    onAddressSelect(addr);
                  }
                }}
                onKeyDown={(e) => {
                  if (isSelectable && (e.key === " " || e.key === "Enter") && onAddressSelect) {
                    e.preventDefault();
                    onAddressSelect(addr);
                  }
                }}
                className={`relative flex flex-col justify-between rounded-2xl border p-5 transition-all text-xs bg-white ${
                  isSelected
                    ? "border-black ring-2 ring-black/10 shadow-xs"
                    : "border-slate-200 hover:border-slate-300 shadow-xs"
                } ${isSelectable ? "cursor-pointer" : ""}`}
              >
                <div>
                  {/* Top Bar: Label & Badges */}
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-1.5 text-slate-800">
                      {getLabelIcon(addr.label)}
                      <span className="font-bold uppercase tracking-wider text-xs">
                        {addr.label}
                      </span>
                    </div>

                    {addr.isDefault && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                        <CheckCircle2 size={12} className="text-emerald-600" />
                        DEFAULT
                      </span>
                    )}
                  </div>

                  {/* Recipient and Address Details */}
                  <div className="mt-3.5 space-y-1">
                    <p className="font-bold text-slate-900 text-sm">{addr.fullName}</p>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      {addr.address}
                      {addr.apartment ? `, ${addr.apartment}` : ""}
                    </p>
                    <p className="text-slate-600 text-xs">
                      {addr.city}, {addr.state} {addr.zip}
                    </p>
                    <p className="text-slate-600 text-xs font-normal">{addr.country}</p>
                    {addr.phone && (
                      <p className="text-[11px] text-slate-400 font-mono mt-1">
                        Phone: {addr.phone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(addr);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      <Edit2 size={13} className="text-slate-500" />
                      <span>Edit</span>
                    </button>
                    <span className="text-slate-200">|</span>
                    <button
                      type="button"
                      disabled={actionInProgressId === addr.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAddress(addr.id);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 transition-colors disabled:opacity-50"
                    >
                      {actionInProgressId === addr.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Trash2 size={13} className="text-rose-500" />
                      )}
                      <span>Delete</span>
                    </button>
                  </div>

                  {!addr.isDefault && (
                    <button
                      type="button"
                      disabled={actionInProgressId === addr.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetDefault(addr.id);
                      }}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors disabled:opacity-50"
                    >
                      {actionInProgressId === addr.id ? "Updating..." : "Set as Default"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Address Modal Dialog */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="address-modal-title"
        >
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Close Button */}
            <button
              type="button"
              onClick={closeModal}
              className="absolute right-5 top-5 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>

            <h3 id="address-modal-title" className="text-base font-bold text-gray-900">
              {editingAddress ? "Edit Saved Address" : "Add New Address"}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Enter your shipping destination details below.
            </p>

            <form onSubmit={handleSaveAddress} className="mt-5 space-y-4 text-xs">
              {/* Address Label Selector */}
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

              {/* Full Name */}
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
                      ? "border-rose-300 bg-rose-50/50 focus:border-rose-500"
                      : "border-gray-200 bg-gray-50/70 focus:border-black focus:bg-white"
                  }`}
                />
                {formErrors.fullName && (
                  <p className="mt-1 text-[11px] text-rose-600">{formErrors.fullName}</p>
                )}
              </div>

              {/* Street Address */}
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
                      ? "border-rose-300 bg-rose-50/50 focus:border-rose-500"
                      : "border-gray-200 bg-gray-50/70 focus:border-black focus:bg-white"
                  }`}
                />
                {formErrors.address && (
                  <p className="mt-1 text-[11px] text-rose-600">{formErrors.address}</p>
                )}
              </div>

              {/* Apartment / Suite (Optional) */}
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

              {/* City, State, ZIP */}
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

              {/* Country & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Country *</label>
                  <select
                    value={formData.country}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, country: e.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/70 px-3 py-2.5 text-xs text-gray-900 focus:border-black focus:bg-white focus:outline-none"
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
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/70 px-3 py-2.5 text-xs text-gray-900 focus:border-black focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Default Checkbox */}
              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, isDefault: e.target.checked }))
                  }
                  className="rounded text-black focus:ring-black h-4 w-4"
                />
                <span className="font-semibold text-gray-700">
                  Set as default delivery address
                </span>
              </label>

              {/* Submit / Cancel Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeModal}
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
                  <span>{editingAddress ? "Save Changes" : "Save Address"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
