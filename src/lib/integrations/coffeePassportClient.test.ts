import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchXoRoasterLots,
  type CoffeePassportLot,
} from "@/src/lib/integrations/coffeePassportClient";

const TEST_URL = "https://coffee-passport.example.test/api/integrations/xo-store/lots";
const TEST_SECRET = "test-shared-secret";

const ETH_LOT: CoffeePassportLot = {
  public_id: "LOT-XO-ETH-001",
  name: "Ethiopia Guji Washed",
  country: "Ethiopia",
  region: "Guji",
  variety: "Heirloom",
  process: "Washed",
  q_grade: 87.5,
};

const COL_LOT: CoffeePassportLot = {
  public_id: "LOT-XO-COL-004",
  name: "Colombia Huila Natural",
  country: "Colombia",
  region: "Huila",
  variety: "Castillo",
  process: "Natural",
  q_grade: 85,
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("fetchXoRoasterLots", () => {
  const originalEnv = { ...process.env };
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env.COFFEE_PASSPORT_INTEGRATION_URL = TEST_URL;
    process.env.COFFEE_PASSPORT_INTEGRATION_SECRET = TEST_SECRET;
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // Test 1 — correct secret returns the expected active XO lots.
  it("returns XO roaster lots when the configured secret is accepted", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, [ETH_LOT, COL_LOT]));

    const result = await fetchXoRoasterLots();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.lots.map((lot) => lot.public_id)).toEqual([
        "LOT-XO-ETH-001",
        "LOT-XO-COL-004",
      ]);
    }
  });

  // Test 2 — missing local configuration never reaches the network at all.
  it("fails with not_configured when the secret env var is unset, without calling fetch", async () => {
    delete process.env.COFFEE_PASSPORT_INTEGRATION_SECRET;

    const result = await fetchXoRoasterLots();

    expect(result).toEqual({ ok: false, error: { kind: "not_configured" } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails with not_configured when the URL env var is unset, without calling fetch", async () => {
    delete process.env.COFFEE_PASSPORT_INTEGRATION_URL;

    const result = await fetchXoRoasterLots();

    expect(result).toEqual({ ok: false, error: { kind: "not_configured" } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // Test 3 — wrong secret, P23's own 401, maps to a typed unauthorized error.
  it("fails with unauthorized when P23 responds 401", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { error: "unauthorized" }));

    const result = await fetchXoRoasterLots();

    expect(result).toEqual({ ok: false, error: { kind: "unauthorized" } });
  });

  it("fails with forbidden when P23 responds 403", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(403, { error: "forbidden" }));

    const result = await fetchXoRoasterLots();

    expect(result).toEqual({ ok: false, error: { kind: "forbidden" } });
  });

  // Test 4 — malformed / non-matching P23 response is rejected, not
  // partially trusted.
  it("fails with invalid_contract when the response is not an array", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { lots: [ETH_LOT] }));

    const result = await fetchXoRoasterLots();

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("invalid_contract");
  });

  it("fails with invalid_contract when a lot is missing public_id", async () => {
    const malformed = [{ ...ETH_LOT, public_id: undefined }];
    fetchMock.mockResolvedValueOnce(jsonResponse(200, malformed));

    const result = await fetchXoRoasterLots();

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("invalid_contract");
  });

  it("fails with unavailable on a network failure (no HTTP response at all)", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));

    const result = await fetchXoRoasterLots();

    expect(result).toEqual({ ok: false, error: { kind: "unavailable" } });
  });

  it("fails with unavailable and the status when P23 answers with a 5xx", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(503, { error: "unavailable" }));

    const result = await fetchXoRoasterLots();

    expect(result).toEqual({ ok: false, error: { kind: "unavailable", status: 503 } });
  });

  // Test 5 — public_id passes through untouched: no re-keying into a
  // Store-local Lot id, no derived slug, no mutation.
  it("keeps public_id as the exact opaque string P23 returned", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, [ETH_LOT]));

    const result = await fetchXoRoasterLots();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.lots[0].public_id).toBe("LOT-XO-ETH-001");
      expect(typeof result.lots[0].public_id).toBe("string");
    }
  });

  // Test 6 — the shared secret is sent exactly once, as the documented
  // Authorization header, and never surfaces in this function's output.
  it("sends the secret only as an Authorization: Bearer header, never in the result", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, [ETH_LOT, COL_LOT]));

    const result = await fetchXoRoasterLots();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(calledUrl).toBe(TEST_URL);
    expect((calledInit.headers as Record<string, string>).Authorization).toBe(
      `Bearer ${TEST_SECRET}`,
    );

    const serialized = JSON.stringify(result);
    expect(serialized.includes(TEST_SECRET)).toBe(false);
  });
});
