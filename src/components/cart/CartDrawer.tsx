"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCartDrawer } from "./CartDrawerContext";
import { CartPageBody } from "./CartPageBody";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function CartDrawer() {
  const { isOpen, close } = useCartDrawer();
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      close();
    }
  }, [pathname, isOpen, close]);

  // Focus management on open/close — this is the "focus management when
  // the drawer opens and closes" the brief asks for, not just a visual
  // slide animation. On open: remember what had focus, then move focus
  // into the panel. On close: give focus back to exactly that element,
  // so a keyboard user ends up back where they were, not at the top of
  // the page.
  useEffect(() => {
    if (isOpen) {
      previouslyFocused.current = document.activeElement as HTMLElement | null;
      closeButtonRef.current?.focus();
    } else {
      previouslyFocused.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        close();
        return;
      }

      if (e.key !== "Tab" || !panelRef.current) return;

      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      // Trap Tab within the panel — wrap from last back to first, and
      // from first back to last on Shift+Tab, instead of letting focus
      // escape into the page behind the overlay.
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, close]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-50 bg-ink-950/70 backdrop-blur-sm"
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Shopping cart"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col overflow-y-auto border-l border-ink-700 bg-ink-950 p-6 shadow-vault"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-xl italic text-ink-50">Your cart</h2>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={close}
                aria-label="Close cart"
                className="rounded-full p-1.5 text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-50"
              >
                <X size={18} />
              </button>
            </div>
            <CartPageBody isDrawer />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
