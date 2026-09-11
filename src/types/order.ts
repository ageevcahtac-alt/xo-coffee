export type PaymentMethodCode = "sbp" | "card" | "invoice";
export type FulfillmentMethod = "delivery" | "pickup";

export type OrderPayloadItem = {
  /** Canonical Lot identity (see src/types/lot.ts's Lot.id) — kept intact
   *  through checkout so a purchased item can always be traced back to the
   *  specific Lot it came from, not just its display name at time of sale. */
  lotId: string;
  name: string;
  quantity: number;
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
