import type { CartItem } from "@/src/lib/cartItems";
import type { Lot } from "@/src/types/lot";

/**
 * Aligns a persisted cart with the current catalog: a line whose packaging is
 * no longer published (or no longer orderable) is dropped, and name/price/
 * weight/country are refreshed from the catalog (Admin is the source of truth
 * for all of them). Lines are matched by `variantId`. Returns the very same
 * array when nothing changed so callers can use it inside a state updater
 * without triggering a re-render loop.
 */
export function reconcileCartItems(items: CartItem[], lots: Lot[]): CartItem[] {
  const byVariant = new Map<string, { lot: Lot; weightGrams: number; price: number }>();
  for (const lot of lots) {
    for (const variant of lot.variants ?? []) {
      if (variant.availableForOrder) {
        byVariant.set(variant.id, { lot, weightGrams: variant.weightGrams, price: variant.price });
      }
    }
  }

  let changed = false;
  const next: CartItem[] = [];

  for (const item of items) {
    const found = byVariant.get(item.variantId);
    if (!found) {
      changed = true;
      continue;
    }
    const { lot, weightGrams, price } = found;
    if (
      lot.id !== item.productId ||
      lot.name !== item.name ||
      lot.country !== item.country ||
      weightGrams !== item.weightGrams ||
      price !== item.price
    ) {
      changed = true;
      next.push({
        ...item,
        productId: lot.id,
        name: lot.name,
        country: lot.country,
        weightGrams,
        price,
      });
    } else {
      next.push(item);
    }
  }

  return changed ? next : items;
}
