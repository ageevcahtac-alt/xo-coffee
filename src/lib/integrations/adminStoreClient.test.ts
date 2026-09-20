import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAdminPublishedProducts } from "@/src/lib/integrations/adminStoreClient";

const URL_VALUE = "https://admin.example.test/api/integrations/xo-store/products";
const SECRET = "test-secret-value-do-not-leak";

const validProduct = {
  id: "p-1",
  slug: "ethiopia-yirgacheffe",
  name: "Ethiopia Yirgacheffe",
  description: "Floral and bright",
  price: 1490,
  passport_public_id: "pp_123",
  updated_at: "2026-09-19T10:00:00.000Z",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("fetchAdminPublishedProducts", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv("ADMIN_INTEGRATION_URL", URL_VALUE);
    vi.stubEnv("ADMIN_INTEGRATION_SECRET", SECRET);
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns published products and sends the secret only as a Bearer header", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ products: [validProduct] }));

    const result = await fetchAdminPublishedProducts();

    expect(result).toEqual({ ok: true, products: [validProduct] });
    const [calledUrl, init] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe(URL_VALUE);
    expect(calledUrl).not.toContain(SECRET);
    expect(init.headers).toEqual({ Authorization: `Bearer ${SECRET}` });
  });

  it("treats an empty product list as a valid result", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ products: [] }));
    expect(await fetchAdminPublishedProducts()).toEqual({ ok: true, products: [] });
  });

  it("accepts null description and null passport_public_id", async () => {
    const product = { ...validProduct, description: null, passport_public_id: null };
    fetchMock.mockResolvedValue(jsonResponse({ products: [product] }));
    expect(await fetchAdminPublishedProducts()).toEqual({ ok: true, products: [product] });
  });

  it("reports not_configured without calling fetch when env is missing", async () => {
    vi.stubEnv("ADMIN_INTEGRATION_SECRET", "");
    expect(await fetchAdminPublishedProducts()).toEqual({
      ok: false,
      error: { kind: "not_configured" },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps 401 to unauthorized and never to a product list", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "Unauthorized." }, 401));
    expect(await fetchAdminPublishedProducts()).toEqual({
      ok: false,
      error: { kind: "unauthorized" },
    });
  });

  it("maps 403 to forbidden", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 403));
    expect(await fetchAdminPublishedProducts()).toEqual({
      ok: false,
      error: { kind: "forbidden" },
    });
  });

  it("maps 503 and other non-2xx statuses to unavailable with the status", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "x" }, 503));
    expect(await fetchAdminPublishedProducts()).toEqual({
      ok: false,
      error: { kind: "unavailable", status: 503 },
    });
  });

  it("maps a network failure to unavailable without throwing", async () => {
    fetchMock.mockRejectedValue(new TypeError(`fetch failed ${SECRET}`));
    const result = await fetchAdminPublishedProducts();
    expect(result).toEqual({ ok: false, error: { kind: "unavailable" } });
    expect(JSON.stringify(result)).not.toContain(SECRET);
  });

  it("rejects a non-JSON body as invalid_contract", async () => {
    fetchMock.mockResolvedValue(new Response("<html>oops</html>", { status: 200 }));
    const result = await fetchAdminPublishedProducts();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("invalid_contract");
  });

  it.each([
    ["a bare array", [validProduct]],
    ["null", null],
    ["products not an array", { products: "nope" }],
    ["missing products", {}],
  ])("rejects %s as invalid_contract", async (_label, body) => {
    fetchMock.mockResolvedValue(jsonResponse(body));
    const result = await fetchAdminPublishedProducts();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("invalid_contract");
  });

  it.each([
    ["missing slug", { ...validProduct, slug: "" }],
    ["string price", { ...validProduct, price: "1490" }],
    ["negative price", { ...validProduct, price: -1 }],
    ["NaN-like price", { ...validProduct, price: null }],
    ["numeric id", { ...validProduct, id: 7 }],
    ["undefined passport id", { ...validProduct, passport_public_id: undefined }],
  ])("rejects the whole response when an entry has %s", async (_label, bad) => {
    fetchMock.mockResolvedValue(jsonResponse({ products: [validProduct, bad] }));
    const result = await fetchAdminPublishedProducts();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("invalid_contract");
  });
});
