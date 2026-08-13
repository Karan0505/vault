"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface CartDrawerContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const CartDrawerContext = createContext<CartDrawerContextValue | null>(null);

export function CartDrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return <CartDrawerContext.Provider value={{ isOpen, open, close }}>{children}</CartDrawerContext.Provider>;
}

export function useCartDrawer(): CartDrawerContextValue {
  const context = useContext(CartDrawerContext);
  if (!context) throw new Error("useCartDrawer must be used within a CartDrawerProvider");
  return context;
}
