import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCatalog, mapAdminProductToLot } from "@/src/lib/store/catalog";
import { LOTS as LEGACY_DEMO_LOTS } from "@/src/data/lots";
import type { AdminStoreProduct } from "@/src/lib/integrations/adminStoreClient";

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
