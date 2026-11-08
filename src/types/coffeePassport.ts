/**
 * The order-summary view of what was bought: one entry per Canonical Lot
 * with the quantity summed across packagings (see mergeOrderItemsByLot).
 * Deliberately minimal — no email, address, payment method or price; the
 * commercial record lives in the Admin order.
 */

export type OrderRecordItem = {
  lotId: string;
  name: string;
  quantity: number;
};
