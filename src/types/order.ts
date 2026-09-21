export type PaymentMethodCode = "sbp" | "card" | "invoice";
export type FulfillmentMethod = "delivery" | "pickup";

export type OrderPayloadItem = {
  /** Canonical Lot identity (see src/types/lot.ts's Lot.id) — kept intact
   *  through checkout so a purchased item can always be traced back to the
   *  specific Lot it came from, not just its display name at time of sale. */
  lotId: string;
  /** The packaging that was bought (Admin's product_variants id). The only
   *  identifier Store sends to Admin to create the order. */
  variantId: string;
  name: string;
  weightGrams: number;
  quantity: number;
  /** Display / cross-check only. Never the source of truth: Admin prices the
   *  order from `variantId` and ignores this. */
  price: number;
  packaging: "whole-bean";
};

export type OrderPayload = {
  orderNumber: string;
  name: string;
  phone: string;
  email: string;
  delivery: {
    method: FulfillmentMethod;
    carrier: string;
    address: string;
  };
  payment: {
    method: PaymentMethodCode;
    company?: { name: string; inn: string };
  };
  items: OrderPayloadItem[];
  total: number;
};

/** What POST /api/order answers. `ok: true` only once Admin has created the
 *  order; `notified` says whether the Telegram message also went out (the
 *  order is real either way). */
export type OrderResponse =
  | { ok: true; orderId: string; notified: boolean }
  | {
      ok: false;
      error:
        | "invalid_json"
        | "missing_fields"
        | "order_rejected"
        | "order_unavailable"
        | "order_not_configured";
    };
