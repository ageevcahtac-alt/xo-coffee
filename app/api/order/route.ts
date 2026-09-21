import { NextResponse } from "next/server";
import { sendOrderToTelegram } from "@/src/lib/telegram";
import { getCatalog } from "@/src/lib/store/catalog";
import { findCatalogDiscrepancies } from "@/src/lib/orderCatalogCheck";
import { placeAdminOrder } from "@/src/lib/integrations/adminStoreClient";
import { buildAdminOrderRequest } from "@/src/lib/checkout/adminOrderRequest";
import { MAX_LINE_QUANTITY } from "@/src/lib/cartItems";
import { runOnce } from "@/src/lib/orderDedupe";
import type { OrderPayload, OrderResponse } from "@/src/types/order";

function isValidPayload(payload: unknown): payload is OrderPayload {
  const p = payload as Partial<OrderPayload> | null;
  return (
    !!p &&
    typeof p.orderNumber === "string" &&
    p.orderNumber.length > 0 &&
    !!p.name &&
    !!p.phone &&
    !!p.email &&
    Array.isArray(p.items) &&
    p.items.length > 0 &&
    p.items.every(
      (item) =>
        !!item &&
        typeof item.variantId === "string" &&
        item.variantId.length > 0 &&
        Number.isInteger(item.quantity) &&
        item.quantity >= 1 &&
        item.quantity <= MAX_LINE_QUANTITY,
    )
  );
}

type Outcome = { status: number; body: OrderResponse };

/** Creates the order in Admin first — that is the fact of the purchase — and
 *  only then sends the existing Telegram notification. */
async function processOrder(payload: OrderPayload): Promise<Outcome> {
  const created = await placeAdminOrder(buildAdminOrderRequest(payload));

  if (!created.ok) {
    console.error("[api/order] Admin did not create the order:", created.error, created.detail ?? "");
    if (created.error === "rejected") {
      return { status: 422, body: { ok: false, error: "order_rejected" } };
    }
    if (created.error === "not_configured") {
      return { status: 503, body: { ok: false, error: "order_not_configured" } };
    }
    return { status: 502, body: { ok: false, error: "order_unavailable" } };
  }

  // Never blocks checkout: a failed or mismatching catalog check only adds
  // warning lines to the order notification.
  const unchecked = ["Каталог был недоступен — цены и товары не проверены"];
  let warnings: string[];
  try {
    const catalog = await getCatalog();
    warnings =
      catalog.status === "ok" ? findCatalogDiscrepancies(payload.items, catalog.lots) : unchecked;
  } catch {
    warnings = unchecked;
  }

  // The order already exists in Admin, so a Telegram failure must not turn
  // into a failed checkout (the buyer would retry and order twice) — it is
  // logged loudly with the order id instead.
  let notified = false;
  try {
    const result = await sendOrderToTelegram(payload, warnings, created.orderId);
    notified = result.ok;
  } catch (error) {
    console.error("[api/order] Failed to notify Telegram", created.orderId, error);
  }
  if (!notified) {
    console.error("[api/order] Telegram notification not delivered for Admin order", created.orderId);
  }

  return { status: 200, body: { ok: true, orderId: created.orderId, notified } };
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" } satisfies OrderResponse, {
      status: 400,
    });
  }

  if (!isValidPayload(payload)) {
    return NextResponse.json({ ok: false, error: "missing_fields" } satisfies OrderResponse, {
      status: 400,
    });
  }

  // Same order number + same cart = the same order, not a second one.
  const signature = JSON.stringify(payload.items.map((i) => [i.variantId, i.quantity]));
  const outcome = await runOnce(
    payload.orderNumber,
    signature,
    () => processOrder(payload),
    (result) => result.body.ok,
  );
  return NextResponse.json(outcome.body, { status: outcome.status });
}
