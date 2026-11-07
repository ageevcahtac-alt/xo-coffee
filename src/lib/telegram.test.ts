import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildOrderMessage, sendOrderToTelegram } from "@/src/lib/telegram";
import type { OrderPayload } from "@/src/types/order";

const DIVIDER = "──────────────────";
// formatPrice: U+00A0 between thousands ("3 702"), plain space before "₽".
const NBSP = " ";
const PRICE_3702 = `3${NBSP}702\u0020₽`;

const ORDER_ID = "ADM-TEST-1001";

function fullPayload(overrides: Partial<OrderPayload> = {}): OrderPayload {
  return {
    orderNumber: "XO-100001",
    name: "Иван",
    phone: "+7 (900) 000-00-00",
    email: "i@example.test",
    delivery: { method: "pickup", carrier: "", address: "Всеволожск" },
    payment: { method: "sbp" },
    items: [
      {
        lotId: "lot-1",
        variantId: "v-250",
        name: "Эфиопия Гуджи",
        weightGrams: 250,
        quantity: 3,
        price: 1234,
        packaging: "whole-bean",
      },
    ],
    total: 3702,
    ...overrides,
  };
}

/** What POST /api/order accepts as minimal (isValidPayload): order contacts
 *  plus items with variantId + quantity only — no payment/delivery/prices.
 *  Mirrors the defect found in the Этап 2A read-only run (order created,
 *  Telegram notification crashed, notified:false). */
function minimalPayload(): OrderPayload {
  return {
    orderNumber: "XO-100777",
    name: "Иван",
    phone: "+7 (900) 000-00-00",
    email: "i@example.test",
    items: [{ variantId: "v-250", quantity: 1 } as OrderPayload["items"][number]],
  } as OrderPayload;
}

const FULL_MESSAGE = [
  "☕ <b>НОВЫЙ ЗАКАЗ #XO-100001</b>",
  `🧾 <b>Заказ в Admin:</b> ${ORDER_ID}`,
  DIVIDER,
  "👤 <b>Клиент:</b> Иван",
  "📞 <b>Телефон:</b> +7 (900) 000-00-00",
  "🏪 <b>Самовывоз:</b> Всеволожск",
  "💳 <b>Оплата:</b> СБП",
  DIVIDER,
  "🛒 <b>Состав заказа:</b>",
  `• Эфиопия Гуджи (250 г, зерно) × 3 — ${PRICE_3702}`,
  DIVIDER,
  `💰 <b>ИТОГО К ОПЛАТЕ: ${PRICE_3702}</b>`,
].join("\n");

describe("buildOrderMessage — full payload (format unchanged)", () => {
  it("renders the exact same message as before the minimal-payload fix", () => {
    expect(buildOrderMessage(fullPayload(), [], ORDER_ID)).toBe(FULL_MESSAGE);
  });

  it("renders delivery address, company line and warnings when present", () => {
    const message = buildOrderMessage(
      fullPayload({
        delivery: { method: "delivery", carrier: "СДЭК", address: "СПб, Невский, 1" },
        payment: { method: "invoice", company: { name: 'ООО "Рома" & Ко', inn: "7812" } },
      }),
      ["цена не совпадает"],
    );
    expect(message).toContain("📍 <b>Адрес:</b> СПб, Невский, 1");
    // escapeHtml escapes & < > only — quotes pass through verbatim.
    expect(message).toContain('🏢 <b>Компания:</b> ООО "Рома" &amp; Ко (ИНН 7812)');
    expect(message).toContain("• цена не совпадает");
  });
});

describe("buildOrderMessage — minimal payload (regression: no exception, no invented values)", () => {
  it("does not throw on a payload without payment/delivery", () => {
    expect(() => buildOrderMessage(minimalPayload(), [])).not.toThrow();
  });

  it("marks payment and delivery as not specified instead of crashing", () => {
    const message = buildOrderMessage(minimalPayload(), []);
    expect(message).toContain("☕ <b>НОВЫЙ ЗАКАЗ #XO-100777</b>");
    expect(message).toContain("💳 <b>Оплата:</b> не указана");
    expect(message).toContain("🚚 <b>Получение:</b> не указано");
  });

  it("keeps the ordered items and never invents name, spec or total", () => {
    const message = buildOrderMessage(minimalPayload(), []);
    expect(message).toContain("• Позиция v-250 × 1");
    expect(message).not.toContain("ИТОГО");
    expect(message).not.toMatch(/NaN|undefined|null/);
  });

  it("treats an unknown payment code like a missing one", () => {
    const odd = fullPayload();
    (odd.payment as { method: string }).method = "crypto";
    const message = buildOrderMessage(odd, []);
    expect(message).toContain("💳 <b>Оплата:</b> не указана");
  });

  it("keeps a neutral marker when delivery has a method but no address", () => {
    const message = buildOrderMessage(
      fullPayload({ delivery: { method: "pickup", carrier: "", address: "" } }),
      [],
    );
    expect(message).toContain("🏪 <b>Самовывоз:</b> адрес не указан");
  });
});

describe("sendOrderToTelegram — minimal payload still notifies (notified:false defect)", () => {
  beforeEach(() => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "tg-token");
    vi.stubEnv("TELEGRAM_CHAT_ID", "tg-chat");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("sends the message built from a minimal payload instead of throwing", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      expect(url).toBe("https://api.telegram.org/bottg-token/sendMessage");
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendOrderToTelegram(minimalPayload());

    expect(result).toEqual({ ok: true, simulated: false });
    // Same house pattern as orderFlow.test.ts: mock calls are untyped tuples.
    const initOf = (call: unknown[]) => call[1] as RequestInit;
    const text = JSON.parse(initOf(fetchMock.mock.calls[0]).body as string).text as string;
    expect(text).toContain("НОВЫЙ ЗАКАЗ #XO-100777");
    expect(text).not.toMatch(/NaN|undefined/);
  });

  it("keeps the dev stub path working for a minimal payload", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
    vi.stubEnv("TELEGRAM_CHAT_ID", "");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const result = await sendOrderToTelegram(minimalPayload());

    expect(result).toEqual({ ok: true, simulated: true });
    expect(String(logSpy.mock.calls[0]?.[0])).toContain("НОВЫЙ ЗАКАЗ #XO-100777");
    logSpy.mockRestore();
  });
});
