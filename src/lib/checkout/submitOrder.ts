import type { OrderPayload, OrderResponse } from "@/src/types/order";

export type SubmitOrderResult =
  | { ok: true; orderId: string }
  | { ok: false; message: string };

const RETRY_MESSAGE =
  "Не удалось оформить заказ. Заказ не создан, корзина сохранена — попробуйте ещё раз.";

const MESSAGES: Record<string, string> = {
  order_rejected:
    "Некоторых позиций уже нет в продаже. Обновите страницу и проверьте корзину.",
};

/**
 * Sends the order to Store's /api/order and reports whether Admin actually
 * created it. Anything short of a confirmed order — a network error, a non-2xx,
 * a 200 without `ok: true` — is a failure with a message the buyer can act on;
 * it is never reported as success.
 */
export async function submitOrder(
  payload: OrderPayload,
  fetchImpl: typeof fetch = fetch,
): Promise<SubmitOrderResult> {
  let response: Response;
  try {
    response = await fetchImpl("/api/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    return { ok: false, message: RETRY_MESSAGE };
  }

  let body: OrderResponse | null = null;
  try {
    body = (await response.json()) as OrderResponse;
  } catch {
    // not JSON — handled below
  }

  if (response.ok && body?.ok === true && typeof body.orderId === "string") {
    return { ok: true, orderId: body.orderId };
  }
  const code = body && body.ok === false ? body.error : "";
  return { ok: false, message: MESSAGES[code] ?? RETRY_MESSAGE };
}
