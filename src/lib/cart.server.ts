import "server-only";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

const CART_COOKIE = "vault_cart_token";
const CART_COOKIE_MAX_AGE_S = 60 * 60 * 24 * 30; // 30 days

export interface CartLineView {
  itemId: string;
  variantId: string;
  productSlug: string;
  productTitle: string;
  options: Record<string, string>;
  sku: string;
  quantity: number;
  unitAmount: number; // recomputed from ProductVariant.priceAmount right now — never trusted from storage
  currency: string;
  lineTotal: number;
  onHand: number;
  isEnabled: boolean;
}

export interface CartView {
  cartId: string;
  lines: CartLineView[];
  currency: string | null;
  subtotal: number;
}

/**
 * Resolves the current request's cart. Signed-in requests use the user's
 * cart (creating one on first use); anonymous requests use a cart keyed
 * to an opaque cookie token. Never trusts a cart id supplied by the
 * client directly — only ever the cookie or the session.
 */
export async function getOrCreateCart(userId: string | null): Promise<{ id: string }> {
  if (userId) {
    const existing = await prisma.cart.findFirst({ where: { userId } });
    if (existing) return existing;
    return prisma.cart.create({ data: { userId } });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(CART_COOKIE)?.value;

  if (token) {
    const existing = await prisma.cart.findUnique({ where: { sessionToken: token } });
    if (existing) return existing;
  }

  const newToken = randomUUID();
  const cart = await prisma.cart.create({ data: { sessionToken: newToken } });
  cookieStore.set(CART_COOKIE, newToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: CART_COOKIE_MAX_AGE_S,
    path: "/",
  });
  return cart;
}

/**
 * Read-only cart lookup for chrome like the header item count — unlike
 * getOrCreateCart, this never creates a cart or sets a cookie as a side
 * effect of a page view that never touches the cart.
 */
export async function peekCartItemCount(userId: string | null): Promise<number> {
  let cartId: string | null = null;

  if (userId) {
    const cart = await prisma.cart.findFirst({ where: { userId }, select: { id: true } });
    cartId = cart?.id ?? null;
  } else {
    const cookieStore = await cookies();
    const token = cookieStore.get(CART_COOKIE)?.value;
    if (token) {
      const cart = await prisma.cart.findUnique({ where: { sessionToken: token }, select: { id: true } });
      cartId = cart?.id ?? null;
    }
  }

  if (!cartId) return 0;

  const result = await prisma.cartItem.aggregate({
    where: { cartId },
    _sum: { quantity: true },
  });
  return result._sum.quantity ?? 0;
}

/** Adds a variant to the cart, or increments quantity if it's already a line. */
export async function addCartItem(cartId: string, variantId: string, quantity: number) {
  if (quantity <= 0) throw new Error("quantity must be positive");

  const existing = await prisma.cartItem.findUnique({
    where: { cartId_variantId: { cartId, variantId } },
  });

  if (existing) {
    return prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + quantity },
    });
  }

  return prisma.cartItem.create({ data: { cartId, variantId, quantity } });
}

export async function updateCartItemQuantity(cartId: string, itemId: string, quantity: number) {
  if (quantity <= 0) {
    return prisma.cartItem.delete({ where: { id: itemId, cartId } }).catch(() => undefined);
  }
  return prisma.cartItem.update({ where: { id: itemId, cartId }, data: { quantity } });
}

export async function removeCartItem(cartId: string, itemId: string) {
  await prisma.cartItem.delete({ where: { id: itemId, cartId } }).catch(() => undefined);
}

/**
 * Builds the priced view of a cart. Every unitAmount and lineTotal comes
 * from ProductVariant.priceAmount as read right now — CartItem never
 * stores a price, so there is no stored number here a client write could
 * have tampered with. This is what "POSTing a modified price in a cart
 * request changes nothing" resolves to structurally.
 */
export async function getCartView(cartId: string): Promise<CartView> {
  const items = await prisma.cartItem.findMany({
    where: { cartId },
    include: {
      variant: {
        include: { product: true, inventoryItem: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const lines: CartLineView[] = items.map((item) => ({
    itemId: item.id,
    variantId: item.variantId,
    productSlug: item.variant.product.slug,
    productTitle: item.variant.product.title,
    options: item.variant.options as Record<string, string>,
    sku: item.variant.sku,
    quantity: item.quantity,
    unitAmount: item.variant.priceAmount,
    currency: item.variant.priceCurrency,
    lineTotal: item.variant.priceAmount * item.quantity,
    onHand: item.variant.inventoryItem?.onHand ?? 0,
    isEnabled: item.variant.isEnabled,
  }));

  const currency = lines[0]?.currency ?? null;
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);

  return { cartId, lines, currency, subtotal };
}

/**
 * Merges a guest cart into a user's cart on sign-in, summing quantities
 * for any variant present in both rather than discarding either side —
 * the brief calls this out explicitly as something customers notice
 * immediately when it's missing.
 */
export async function mergeGuestCartIntoUser(guestCartId: string, userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const userCart = await tx.cart.findFirst({ where: { userId } });
    if (!userCart) {
      await tx.cart.update({ where: { id: guestCartId }, data: { userId, sessionToken: null } });
      return;
    }

    const guestItems = await tx.cartItem.findMany({ where: { cartId: guestCartId } });
    for (const item of guestItems) {
      const existing = await tx.cartItem.findUnique({
        where: { cartId_variantId: { cartId: userCart.id, variantId: item.variantId } },
      });
      if (existing) {
        await tx.cartItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + item.quantity },
        });
      } else {
        await tx.cartItem.create({
          data: { cartId: userCart.id, variantId: item.variantId, quantity: item.quantity },
        });
      }
    }

    await tx.cart.delete({ where: { id: guestCartId } });
  });

  const cookieStore = await cookies();
  cookieStore.delete(CART_COOKIE);
}
