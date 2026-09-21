import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as postOrder } from "@/app/api/order/route";
import { submitOrder } from "@/src/lib/checkout/submitOrder";
import { createSubmitLock } from "@/src/lib/checkout/submitLock";
import { resetOrderDedupe } from "@/src/lib/orderDedupe";
import type { OrderPayload } from "@/src/types/order";

const SECRET = "test-secret-value-do-not-leak";
const PRODUCTS_URL = "https://admin.example.test/api/integrations/xo-store/products";
const ORDERS_URL = "https://admin.example.test/api/integrations/xo-store/orders";
const VARIANT = "11111111-1111-4111-8111-111111111111";
const ORDER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const catalogBody = {
  products: [
    {
      id: "0b6f3c1e-1111-4222-8333-444455556666",
      slug: "guji",
      name: "Эфиопия Гуджи",
      description: null,
      price: 1234,
      passport_public_id: null,
      updated_at: "2026-09-21T10:00:00.000Z",
      variants: [{ id: VARIANT, weight_grams: 250, price: 1234, available_for_order: true }],
    },
  ],
};

function payload(overrides: Partial<OrderPayload> = {}): OrderPayload {
  return {
    orderNumber: "XO-100001",
    name: "Иван",
    phone: "+7 (900) 000-00-00",
    email: "i@example.test",
    delivery: { method: "pickup", carrier: "", address: "Всеволожск" },
    payment: { method: "sbp" },
    items: [
      {
        lotId: "0b6f3c1e-1111-4222-8333-444455556666",
        variantId: VARIANT,
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

function post(body: unknown) {
  return postOrder(
    new Request("http://localhost/api/order", { method: "POST", body: JSON.stringify(body) }),
  );
}

type Route = { status?: number; body?: unknown; throws?: boolean };

/** Routes the mocked global fetch by URL: Admin products / Admin orders / Telegram. */
function stubNetwork(routes: { orders?: Route; telegram?: Route } = {}) {
  const fetchMock = vi.fn(async (url: string) => {
    const respond = (route: Route | undefined, fallback: unknown, status = 200) => {
      if (route?.throws) throw new TypeError("network down");
      return new Response(JSON.stringify(route?.body ?? fallback), {
        status: route?.status ?? status,
      });
    };
    if (url === PRODUCTS_URL) return respond(undefined, catalogBody);
    if (url === ORDERS_URL) return respond(routes.orders, { order_id: ORDER_ID }, 201);
    if (url.startsWith("https://api.telegram.org/")) return respond(routes.telegram, { ok: true });
    throw new Error(`unexpected fetch ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

type Mock = ReturnType<typeof stubNetwork>;
const callsTo = (fetchMock: Mock, match: (url: string) => boolean) =>
  fetchMock.mock.calls.filter(([url]) => match(String(url)));
const adminOrderCalls = (m: Mock) => callsTo(m, (url) => url === ORDERS_URL);
const telegramCalls = (m: Mock) => callsTo(m, (url) => url.startsWith("https://api.telegram.org/"));
const initOf = (call: unknown[]) => call[1] as RequestInit;

beforeEach(() => {
  resetOrderDedupe();
  vi.stubEnv("ADMIN_INTEGRATION_URL", PRODUCTS_URL);
  vi.stubEnv("ADMIN_INTEGRATION_SECRET", SECRET);
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "tg-token");
  vi.stubEnv("TELEGRAM_CHAT_ID", "tg-chat");
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("F/G. what Store sends to Admin", () => {
  it("sends the variant and quantity only — never the client's price, weight, stock or lot", async () => {
    const fetchMock = stubNetwork();
    // A tampering client: price 1, plus made-up stock / to_produce / weight fields.
    const tampered = payload();
    Object.assign(tampered.items[0], { price: 1, stock_units: 999, to_produce: 0, weight_grams: 5 });
    tampered.total = 3;

    const response = await post(tampered);
    expect(response.status).toBe(200);

    const calls = adminOrderCalls(fetchMock);
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe(ORDERS_URL);
    const init = initOf(calls[0]);
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${SECRET}`);
    expect(JSON.parse(init.body as string)).toEqual({
      customer_name: "Иван",
      customer_contact: "+7 (900) 000-00-00, i@example.test",
      items: [{ variant_id: VARIANT, quantity: 3 }],
    });
    expect(init.body as string).not.toMatch(/price|stock|to_produce|weight|lot/i);
  });

  it("rejects a payload whose items have no variant_id before calling Admin", async () => {
    const fetchMock = stubNetwork();
    const bad = payload();
    delete (bad.items[0] as Partial<(typeof bad.items)[0]>).variantId;
    expect((await post(bad)).status).toBe(400);
    expect(adminOrderCalls(fetchMock)).toHaveLength(0);
  });
});

describe("H. a created Admin order is a successful checkout", () => {
  it("answers ok with the Admin order id", async () => {
    stubNetwork();
    const response = await post(payload());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, orderId: ORDER_ID, notified: true });
  });

  it("submitOrder reports success only for a confirmed order", async () => {
    stubNetwork();
    const viaRoute = (_: string, init: RequestInit) => post(JSON.parse(init.body as string));
    const result = await submitOrder(payload(), viaRoute as unknown as typeof fetch);
    expect(result).toEqual({ ok: true, orderId: ORDER_ID });
  });

  it("stock is invisible to Store: the request is the same whatever Admin's stock is (0, short or plenty)", async () => {
    // Admin's place_order decides from_stock / to_produce; Store only ever
    // sends variant_id + quantity, so the outcome of 40→37, 0→to_produce 3 and
    // 2→to_produce 3 is entirely Admin's.
    const fetchMock = stubNetwork();
    await post(payload({ orderNumber: "XO-A" }));
    await post(payload({ orderNumber: "XO-B" }));
    const bodies = adminOrderCalls(fetchMock).map((call) => initOf(call).body);
    expect(bodies[0]).toBe(bodies[1]);
  });
});

describe("I. an Admin failure is never shown as success", () => {
  it.each([
    ["unavailable (503)", { status: 503, body: { error: "x" } }, 502, "order_unavailable"],
    ["network down", { throws: true }, 502, "order_unavailable"],
    ["unauthorized (401)", { status: 401, body: { error: "x" } }, 502, "order_unavailable"],
    ["rejected (422)", { status: 422, body: { error: "variant inactive" } }, 422, "order_rejected"],
    ["201 without order_id", { status: 201, body: {} }, 502, "order_unavailable"],
  ] as const)("%s", async (_label, orders, status, error) => {
    const fetchMock = stubNetwork({ orders });
    const response = await post(payload());
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ ok: false, error });
    expect(telegramCalls(fetchMock)).toHaveLength(0);
  });

  it("submitOrder turns it into a retryable failure (the UI keeps the cart and shows the message)", async () => {
    stubNetwork({ orders: { status: 503, body: {} } });
    const viaRoute = (_: string, init: RequestInit) => post(JSON.parse(init.body as string));
    const result = await submitOrder(payload(), viaRoute as unknown as typeof fetch);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/корзина сохранена/);
  });

  it("submitOrder treats a network error or a bad body as a failure, never as success", async () => {
    const down = vi.fn().mockRejectedValue(new TypeError("offline"));
    expect((await submitOrder(payload(), down as unknown as typeof fetch)).ok).toBe(false);
    const garbage = vi.fn().mockResolvedValue(new Response("<html>", { status: 200 }));
    expect((await submitOrder(payload(), garbage as unknown as typeof fetch)).ok).toBe(false);
  });

  it("does not leak the secret in the response", async () => {
    stubNetwork({ orders: { status: 503, body: { error: SECRET } } });
    const response = await post(payload());
    expect(await response.text()).not.toContain(SECRET);
  });
});

describe("J. no obvious duplicate orders", () => {
  it("two simultaneous submits of one order create ONE Admin order and ONE notification", async () => {
    const fetchMock = stubNetwork();
    const [a, b] = await Promise.all([post(payload()), post(payload())]);
    expect(await a.json()).toEqual(await b.json());
    expect(adminOrderCalls(fetchMock)).toHaveLength(1);
    expect(telegramCalls(fetchMock)).toHaveLength(1);
  });

  it("a resubmit after a confirmed order (refresh mid-send) returns the same order", async () => {
    const fetchMock = stubNetwork();
    await post(payload());
    const again = await post(payload());
    expect((await again.json()).orderId).toBe(ORDER_ID);
    expect(adminOrderCalls(fetchMock)).toHaveLength(1);
  });

  it("a failed attempt can always be retried", async () => {
    stubNetwork({ orders: { status: 503, body: {} } });
    expect((await post(payload())).status).toBe(502);
    const fetchMock = stubNetwork(); // Admin is back
    expect((await post(payload())).status).toBe(200);
    expect(adminOrderCalls(fetchMock)).toHaveLength(1);
  });

  it("a different cart under the same number is a new order, not a stale result", async () => {
    const fetchMock = stubNetwork();
    await post(payload());
    const changed = payload();
    changed.items[0].quantity = 5;
    await post(changed);
    expect(adminOrderCalls(fetchMock)).toHaveLength(2);
  });

  it("the client submit lock runs one submit at a time", async () => {
    const lock = createSubmitLock();
    const task = vi.fn(() => new Promise<string>((resolve) => setTimeout(() => resolve("done"), 5)));
    const [first, second] = await Promise.all([lock.run(task), lock.run(task)]);
    expect(task).toHaveBeenCalledTimes(1);
    expect([first, second]).toEqual(["done", undefined]);
    await lock.run(task); // free again afterwards
    expect(task).toHaveBeenCalledTimes(2);
  });
});

describe("K. the existing Telegram flow still works", () => {
  it("notifies Telegram after the Admin order, with the Admin order id and the real weight", async () => {
    const fetchMock = stubNetwork();
    await post(payload());
    const calls = telegramCalls(fetchMock);
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe("https://api.telegram.org/bottg-token/sendMessage");
    const text = JSON.parse(initOf(calls[0]).body as string).text as string;
    expect(text).toContain("НОВЫЙ ЗАКАЗ #XO-100001");
    expect(text).toContain(ORDER_ID);
    expect(text).toContain("Эфиопия Гуджи (250 г, зерно) × 3");
  });

  it("adds a warning line when the client price disagrees with the Admin catalog, without rejecting", async () => {
    const fetchMock = stubNetwork();
    const cheap = payload();
    cheap.items[0].price = 1;
    expect((await post(cheap)).status).toBe(200);
    const text = JSON.parse(initOf(telegramCalls(fetchMock)[0]).body as string).text;
    expect(text).toContain("расхождение с каталогом");
  });

  it("a Telegram outage does not fail (or duplicate) an order that Admin already has", async () => {
    stubNetwork({ telegram: { throws: true } });
    const response = await post(payload());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, orderId: ORDER_ID, notified: false });
  });

  it("without Telegram env it still logs the order (dev stub) and succeeds", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
    vi.stubEnv("TELEGRAM_CHAT_ID", "");
    stubNetwork();
    const response = await post(payload());
    expect(response.status).toBe(200);
    expect(String((console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0])).toContain(
      "НОВЫЙ ЗАКАЗ",
    );
  });
});
