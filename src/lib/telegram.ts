import { formatPrice } from "@/src/lib/format";
import type { OrderPayload, PaymentMethodCode } from "@/src/types/order";

const PAYMENT_METHOD_LABELS: Record<PaymentMethodCode, string> = {
  sbp: "СБП",
  card: "Карта (Тестовый режим)",
  invoice: "Счёт",
};

const STANDARD_BAG_WEIGHT = "250 г";
const DIVIDER = "──────────────────";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildOrderMessage(order: OrderPayload) {
  const paymentLabel = PAYMENT_METHOD_LABELS[order.payment.method];
  const locationLine =
    order.delivery.method === "pickup"
      ? `🏪 <b>Самовывоз:</b> ${escapeHtml(order.delivery.address)}`
      : `📍 <b>Адрес:</b> ${escapeHtml(order.delivery.address)}`;

  const lines = [
    `☕ <b>НОВЫЙ ЗАКАЗ #${order.orderNumber}</b>`,
    DIVIDER,
    `👤 <b>Клиент:</b> ${escapeHtml(order.name)}`,
    `📞 <b>Телефон:</b> ${escapeHtml(order.phone)}`,
    locationLine,
    `💳 <b>Оплата:</b> ${escapeHtml(paymentLabel)}`,
    ...(order.payment.company
      ? [
          `🏢 <b>Компания:</b> ${escapeHtml(order.payment.company.name)} (ИНН ${escapeHtml(order.payment.company.inn)})`,
        ]
      : []),
    DIVIDER,
    "🛒 <b>Состав заказа:</b>",
    ...order.items.map(
      (item) =>
        `• ${escapeHtml(item.name)} (${STANDARD_BAG_WEIGHT}, зерно) × ${item.quantity} — ${formatPrice(item.price * item.quantity)}`,
    ),
    DIVIDER,
    `💰 <b>ИТОГО К ОПЛАТЕ: ${formatPrice(order.total)}</b>`,
  ];
  return lines.join("\n");
}

export async function sendOrderToTelegram(order: OrderPayload) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const text = buildOrderMessage(order);

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
