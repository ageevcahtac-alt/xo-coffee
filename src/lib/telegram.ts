import { formatPrice } from "@/src/lib/format";
import { formatWeight } from "@/src/lib/variants";
import type { OrderPayload, OrderPayloadItem, PaymentMethodCode } from "@/src/types/order";

const PAYMENT_METHOD_LABELS: Record<PaymentMethodCode, string> = {
  sbp: "СБП",
  card: "Карта (Тестовый режим)",
  invoice: "Счёт",
};

const DIVIDER = "──────────────────";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** One message line per ordered item. A full item renders exactly as before
 *  ("• name (250 г, зерно) × 3 — 3 702 ₽"); a minimally-valid item (only
 *  variantId + quantity — see /api/order's isValidPayload) never crashes and
 *  carries no invented name, spec or price. */
function formatItemLine(item: OrderPayloadItem): string {
  const name = item.name
    ? escapeHtml(item.name)
    : `Позиция ${escapeHtml(item.variantId)}`;
  const spec = Number.isFinite(item.weightGrams)
    ? ` (${formatWeight(item.weightGrams)}, зерно)`
    : "";
  const sum = Number.isFinite(item.price)
    ? ` — ${formatPrice(item.price * item.quantity)}`
    : "";
  return `• ${name}${spec} × ${item.quantity}${sum}`;
}

/** Builds the operator's order message. Tolerates a minimally-valid payload
 *  (no payment / delivery / prices): optional lines get a neutral marker or
 *  are omitted, never a fabricated value. The full-payload format is
 *  unchanged. */
export function buildOrderMessage(order: OrderPayload, warnings: string[], adminOrderId?: string) {
  const paymentMethod = order.payment?.method;
  const paymentLabel = paymentMethod
    ? (PAYMENT_METHOD_LABELS[paymentMethod] ?? "не указана")
    : "не указана";
  const delivery = order.delivery;
  const deliveryAddress = delivery?.address ? escapeHtml(delivery.address) : "адрес не указан";
  const locationLine =
    !delivery || !delivery.method
      ? "🚚 <b>Получение:</b> не указано"
      : delivery.method === "pickup"
        ? `🏪 <b>Самовывоз:</b> ${deliveryAddress}`
        : `📍 <b>Адрес:</b> ${deliveryAddress}`;

  const lines = [
    `☕ <b>НОВЫЙ ЗАКАЗ #${order.orderNumber}</b>`,
    ...(adminOrderId ? [`🧾 <b>Заказ в Admin:</b> ${escapeHtml(adminOrderId)}`] : []),
    DIVIDER,
    `👤 <b>Клиент:</b> ${escapeHtml(order.name)}`,
    `📞 <b>Телефон:</b> ${escapeHtml(order.phone)}`,
    locationLine,
    `💳 <b>Оплата:</b> ${escapeHtml(paymentLabel)}`,
    ...(order.payment?.company
      ? [
          `🏢 <b>Компания:</b> ${escapeHtml(order.payment.company.name)} (ИНН ${escapeHtml(order.payment.company.inn)})`,
        ]
      : []),
    DIVIDER,
    "🛒 <b>Состав заказа:</b>",
    ...order.items.map(formatItemLine),
    DIVIDER,
    ...(Number.isFinite(order.total)
      ? [`💰 <b>ИТОГО К ОПЛАТЕ: ${formatPrice(order.total)}</b>`]
      : []),
    ...(warnings.length > 0
      ? [
          DIVIDER,
          "⚠️ <b>Проверьте заказ — расхождение с каталогом:</b>",
          ...warnings.map((warning) => `• ${escapeHtml(warning)}`),
        ]
      : []),
  ];
  return lines.join("\n");
}

export async function sendOrderToTelegram(
  order: OrderPayload,
  warnings: string[] = [],
  adminOrderId?: string,
) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const text = buildOrderMessage(order, warnings, adminOrderId);

  if (!token || !chatId) {
    console.log(
      "[telegram:stub] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID не заданы — заказ не отправлен, вывожу в лог для разработки:\n" +
        text,
    );
    return { ok: true, simulated: true as const };
  }

  const response = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
    },
  );

  return { ok: response.ok, simulated: false as const };
}
