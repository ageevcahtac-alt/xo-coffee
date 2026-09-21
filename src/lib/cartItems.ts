import type { Lot, LotVariant } from "@/src/types/lot";

/**
 * A cart line is one packaging of one product. `variantId` is its identity —
 * never the weight or the name — and is what checkout sends to Admin.
 * `price` / `weightGrams` / `name` are display data only: Admin re-derives
 * every one of them from `variantId` when the order is created.
 */
export type CartItem = {
  productId: string;
  variantId: string;
  name: string;
  country: string;
  weightGrams: number;
  price: number;
  quantity: number;
};

/** A cart line nobody would actually want — a sane ceiling to clamp corrupted
 *  or hand-edited storage to. */
export const MAX_LINE_QUANTITY = 99;

export function buildCartItem(lot: Lot, variant: LotVariant): Omit<CartItem, "quantity"> {
  return {
    productId: lot.id,
    variantId: variant.id,
    name: lot.name,
    country: lot.country,
    weightGrams: variant.weightGrams,
    price: variant.price,
  };
}

/** Validates one cart line read back from localStorage. A corrupted or
 *  hand-edited value — or a pre-variant line that has no `variantId` — is
 *  dropped rather than trusted or guessed at. */
export function isValidCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.productId === "string" &&
    item.productId.length > 0 &&
    typeof item.variantId === "string" &&
    item.variantId.length > 0 &&
    typeof item.name === "string" &&
    typeof item.country === "string" &&
    typeof item.weightGrams === "number" &&
    Number.isFinite(item.weightGrams) &&
    item.weightGrams > 0 &&
    typeof item.price === "number" &&
    Number.isFinite(item.price) &&
    item.price >= 0 &&
    typeof item.quantity === "number" &&
    Number.isInteger(item.quantity) &&
    item.quantity > 0
  );
}

/** Adds a line, merging by `variantId` — two packagings of one product stay
 *  two lines, and the same packaging is one line. */
export function addCartItem(
  items: CartItem[],
  item: Omit<CartItem, "quantity">,
  quantity = 1,
): CartItem[] {
  const existing = items.find((i) => i.variantId === item.variantId);
  if (existing) {
    return items.map((i) =>
      i.variantId === item.variantId
        ? { ...i, quantity: Math.min(i.quantity + quantity, MAX_LINE_QUANTITY) }
        : i,
    );
  }
  return [...items, { ...item, quantity: Math.min(quantity, MAX_LINE_QUANTITY) }];
}

export function setCartItemQuantity(
  items: CartItem[],
  variantId: string,
  quantity: number,
): CartItem[] {
  // Not `<= 0`: NaN fails every comparison, so it would otherwise be written
  // into state instead of removing the line.
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return items.filter((i) => i.variantId !== variantId);
  }
  return items.map((i) =>
    i.variantId === variantId ? { ...i, quantity: Math.min(quantity, MAX_LINE_QUANTITY) } : i,
  );
}
