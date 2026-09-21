import type { AdminOrderRequest } from "@/src/lib/integrations/adminStoreClient";
import type { OrderPayload } from "@/src/types/order";

/**
 * The one place a checkout payload becomes an Admin order. Admin gets the
 * variant and the count per line — price, weight, stock and lot are looked up
 * by Admin from `variant_id`, so nothing the browser claims about them is
 * forwarded. Customer details are contact info only.
 */
export function buildAdminOrderRequest(
  payload: Pick<OrderPayload, "name" | "phone" | "email" | "items">,
): AdminOrderRequest {
  return {
    customer_name: payload.name,
    customer_contact: [payload.phone, payload.email].filter(Boolean).join(", "),
    items: payload.items.map((item) => ({
      variant_id: item.variantId,
      quantity: item.quantity,
    })),
  };
}
