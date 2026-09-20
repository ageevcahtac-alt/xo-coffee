import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCatalog, mapAdminProductToLot } from "@/src/lib/store/catalog";
import { reconcileCartItems } from "@/src/lib/cartReconcile";
import { POST as postOrder } from "@/app/api/order/route";
import { LOTS as LEGACY_DEMO_LOTS } from "@/src/data/lots";
import type { AdminStoreProduct } from "@/src/lib/integrations/adminStoreClient";
import type { CartItem } from "@/src/context/CartContext";

const SECRET = "test-secret-value-do-not-leak";

const product: AdminStoreProduct = {
  id: "0b6f3c1e-1111-4222-8333-444455556666",
  slug: "ethiopia-yirgacheffe",
  name: "Ethiopia Yirgacheffe",
  description: "Floral and bright",
  price: 1490,
  passport_public_id: "pp_123",
  updated_at: "2026-09-19T10:00:00.000Z",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("mapAdminProductToLot", () => {
  it("preserves id, slug, name, description, price and passport_public_id", () => {
    const lot = mapAdminProductToLot(product);
    expect(lot).toMatchObject({
      id: product.id,
      slug: product.slug,
      name: product.name,
      description: product.description,
      price: product.price,
      passportPublicId: product.passport_public_id,
    });
  });

  it("omits description and passportPublicId when Admin sends null", () => {
    const lot = mapAdminProductToLot({
      ...product,
      description: null,
      passport_public_id: null,
    });
    expect(lot).not.toHaveProperty("description");
    expect(lot).not.toHaveProperty("passportPublicId");
  });
});

describe("getCatalog", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv("ADMIN_INTEGRATION_URL", "https://admin.example.test/products");
    vi.stubEnv("ADMIN_INTEGRATION_SECRET", SECRET);
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns exactly the published products Admin sends", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ products: [product] }));
    const catalog = await getCatalog();
    expect(catalog.status).toBe("ok");
    expect(catalog.lots.map((lot) => lot.id)).toEqual([product.id]);
  });

  it("treats an empty catalog as valid (ok, no lots)", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ products: [] }));
    expect(await getCatalog()).toEqual({ status: "ok", lots: [] });
  });

  it.each([401, 403, 503])(
    "reports unavailable on HTTP %i and never falls back to the demo catalog",
    async (status) => {
      fetchMock.mockResolvedValue(jsonResponse({ error: "x" }, status));
      expect(await getCatalog()).toEqual({ status: "unavailable", lots: [] });
    },
  );

  it("reports unavailable on a malformed response", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ products: [{ id: 1 }] }));
    expect(await getCatalog()).toEqual({ status: "unavailable", lots: [] });
  });

  it("never writes the secret to logs", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 401));
    await getCatalog();
    const logged = JSON.stringify([
      (console.error as ReturnType<typeof vi.fn>).mock.calls,
      (console.warn as ReturnType<typeof vi.fn>).mock.calls,
    ]);
    expect(logged).not.toContain(SECRET);
  });

  it("uses the demo catalog only when unconfigured outside production", async () => {
    vi.stubEnv("ADMIN_INTEGRATION_URL", "");
    vi.stubEnv("ADMIN_INTEGRATION_SECRET", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(await getCatalog()).toEqual({ status: "ok", lots: LEGACY_DEMO_LOTS });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never serves the demo catalog in production, even when unconfigured", async () => {
    vi.stubEnv("ADMIN_INTEGRATION_URL", "");
    vi.stubEnv("ADMIN_INTEGRATION_SECRET", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(await getCatalog()).toEqual({ status: "unavailable", lots: [] });
  });
});

describe("Admin products through the legacy cart and checkout", () => {
  const lot = mapAdminProductToLot(product);

  function stubAdminCatalog() {
    vi.stubEnv("ADMIN_INTEGRATION_URL", "https://admin.example.test/products");
    vi.stubEnv("ADMIN_INTEGRATION_SECRET", SECRET);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ products: [product] })));
  }

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("reconcile drops unpublished lines and refreshes price/name from the catalog", () => {
    const items: CartItem[] = [
      { id: lot.id, name: "Old name", country: "", price: 999, quantity: 2 },
      { id: "lot-014", name: "Legacy", country: "Эфиопия", price: 1490, quantity: 1 },
    ];
    expect(reconcileCartItems(items, [lot])).toEqual([
      { id: lot.id, name: lot.name, country: "", price: lot.price, quantity: 2 },
    ]);
  });

  it("reconcile returns the same array when nothing changed", () => {
    const items: CartItem[] = [
      { id: lot.id, name: lot.name, country: lot.country, price: lot.price, quantity: 1 },
    ];
    expect(reconcileCartItems(items, [lot])).toBe(items);
  });

  it("/api/order flags an order whose price differs from the Admin catalog, without rejecting it", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
    vi.stubEnv("TELEGRAM_CHAT_ID", "");
    stubAdminCatalog();
    const response = await postOrder(
      new Request("http://localhost/api/order", {
        method: "POST",
        body: JSON.stringify({
          orderNumber: "XO-TEST-2",
          name: "Test",
          phone: "+70000000000",
          email: "t@example.test",
          delivery: { method: "pickup", carrier: "", address: "" },
          payment: { method: "sbp" },
          items: [
            { lotId: product.id, name: product.name, quantity: 1, price: 1, packaging: "whole-bean" },
          ],
          total: 1,
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(String(log.mock.calls[0]?.[0])).toContain("расхождение с каталогом");
    vi.unstubAllEnvs();
  });

  it("/api/order accepts an order built from an Admin product", async () => {
    stubAdminCatalog();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
    vi.stubEnv("TELEGRAM_CHAT_ID", "");
    const response = await postOrder(
      new Request("http://localhost/api/order", {
        method: "POST",
        body: JSON.stringify({
          orderNumber: "XO-TEST-1",
          name: "Test",
          phone: "+70000000000",
          email: "t@example.test",
          delivery: { method: "pickup", carrier: "", address: "" },
          payment: { method: "sbp" },
          items: [
            {
              lotId: lot.id,
              name: lot.name,
              quantity: 1,
              price: lot.price,
              packaging: "whole-bean",
            },
          ],
          total: lot.price,
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true });
    vi.unstubAllEnvs();
  });
});
