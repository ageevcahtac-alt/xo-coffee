export type PaymentMethodCode = "sbp" | "card" | "invoice";
export type FulfillmentMethod = "delivery" | "pickup";

export type OrderPayloadItem = {
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
