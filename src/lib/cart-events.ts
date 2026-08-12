/** Dispatched on window after any cart mutation so chrome like the header badge can refresh without prop drilling. */
export const CART_UPDATED_EVENT = "vault:cart-updated";

export function notifyCartUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT));
  }
}
