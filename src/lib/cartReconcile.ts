import type { CartItem } from "@/src/context/CartContext";
import type { Lot } from "@/src/types/lot";

/**
 * Aligns a persisted cart with the current catalog: a line whose product is
 * no longer published is dropped, and name/price/country are refreshed from
 * the catalog (Admin is the source of truth for both). Returns the very same
 * array when nothing changed so callers can use it inside a state updater
 * without triggering a re-render loop.
 */
export function reconcileCartItems(items: CartItem[], lots: Lot[]): CartItem[] {
  const byId = new Map(lots.map((lot) => [lot.id, lot]));
  let changed = false;
  const next: CartItem[] = [];

  for (const item of items) {
    const lot = byId.get(item.id);
    if (!lot) {
      changed = true;
      continue;
    }
    if (lot.name !== item.name || lot.price !== item.price || lot.country !== item.country) {
      changed = true;
      next.push({ ...item, name: lot.name, price: lot.price, country: lot.country });
    } else {
      next.push(item);
    }
  }

  return changed ? next : items;
}
