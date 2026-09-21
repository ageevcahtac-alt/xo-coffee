import { generateOrderNumber } from "@/src/lib/orderNumber";

const KEY = "xo-coffee-pending-order-number";

/**
 * The order number of the checkout attempt in progress, kept in
 * sessionStorage so a page refresh in the middle of sending — followed by a
 * second submit — reuses the same number. The server treats a repeated number
 * for the same cart as the same order (see src/lib/orderDedupe.ts) instead of
 * creating a second one. Cleared once an order is confirmed.
 */
export function getPendingOrderNumber(): string {
  try {
    const stored = sessionStorage.getItem(KEY);
    if (stored) return stored;
    const fresh = generateOrderNumber();
    sessionStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    return generateOrderNumber();
  }
}

export function clearPendingOrderNumber(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // storage unavailable — nothing to clear
  }
}
