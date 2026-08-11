/**
 * Money is always an integer amount in the currency's minor unit
 * (cents for USD, pence for GBP, ...) paired with an explicit ISO 4217
 * currency code. Nothing in this codebase should hold a price as a
 * float — see docs/decisions/0002-money-as-integer-minor-units.md.
 */

export interface Money {
  amount: number; // integer minor units
  currency: string; // ISO 4217, e.g. "USD"
}

const MINOR_UNIT_EXPONENT: Record<string, number> = {
  USD: 2,
  EUR: 2,
  GBP: 2,
  JPY: 0,
  INR: 2,
};

function exponentFor(currency: string): number {
  return MINOR_UNIT_EXPONENT[currency] ?? 2;
}

/** Asserts the amount is a safe, non-negative integer. Throws otherwise. */
export function assertIntegerMinorUnits(amount: number, label = "amount"): void {
  if (!Number.isInteger(amount)) {
    throw new Error(`${label} must be an integer minor-unit value, got ${amount}`);
  }
  if (amount < 0) {
    throw new Error(`${label} must not be negative, got ${amount}`);
  }
  if (!Number.isSafeInteger(amount)) {
    throw new Error(`${label} exceeds safe integer range`);
  }
}

/** Formats a Money value for display, e.g. { amount: 4999, currency: "USD" } -> "$49.99". */
export function formatMoney({ amount, currency }: Money, locale = "en-US"): string {
  assertIntegerMinorUnits(amount, "amount");
  const exponent = exponentFor(currency);
  const major = amount / 10 ** exponent;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
  }).format(major);
}

/** Adds two Money values of the same currency. Throws on currency mismatch. */
export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot add mismatched currencies: ${a.currency} vs ${b.currency}`);
  }
  return { amount: a.amount + b.amount, currency: a.currency };
}

/**
 * Splits an integer amount into `parts` integer shares that sum back to
 * the original amount exactly, largest-remainder first. Used for
 * discount-across-line-items and split-refund math where naive division
 * leaves a remainder cent that must land somewhere deterministic.
 */
export function splitEvenly(amount: number, parts: number): number[] {
  assertIntegerMinorUnits(amount, "amount");
  if (parts <= 0) throw new Error("parts must be a positive integer");
  const base = Math.floor(amount / parts);
  const remainder = amount - base * parts;
  return Array.from({ length: parts }, (_, i) => base + (i < remainder ? 1 : 0));
}
