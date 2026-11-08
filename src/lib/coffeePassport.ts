import type { OrderRecordItem } from "@/src/types/coffeePassport";

/**
 * The one piece of the former local Coffee Passport layer the Store still
 * needs: merging order items per Canonical Lot for the success screen.
 * A cart line is a packaging (variant), so an order of 250 g + 1 kg of the
 * same coffee arrives as two items with the same `lotId`; for the
 * post-purchase summary that is ONE coffee, with the quantities summed.
 * The variant is commercial data (cart / Admin order) and is deliberately
 * not part of this view.
 */

export function mergeOrderItemsByLot(items: OrderRecordItem[]): OrderRecordItem[] {
  const merged = new Map<string, OrderRecordItem>();
  for (const item of items) {
    const existing = merged.get(item.lotId);
    merged.set(
      item.lotId,
      existing ? { ...existing, quantity: existing.quantity + item.quantity } : { ...item },
    );
  }
  return [...merged.values()];
}

export type { OrderRecordItem };
