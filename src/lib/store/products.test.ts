import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CoffeePassportLot } from "@/src/lib/integrations/coffeePassportClient";

const fetchXoRoasterLotsMock = vi.fn();
vi.mock("@/src/lib/integrations/coffeePassportClient", () => ({
  fetchXoRoasterLots: () => fetchXoRoasterLotsMock(),
}));

const createSupabaseServerClientMock = vi.fn();
vi.mock("@/src/lib/supabase/server", () => ({
  createSupabaseServerClient: () => createSupabaseServerClientMock(),
}));

const {
  createStoreProduct,
  listStoreProductsByPassportPublicId,
} = await import("@/src/lib/store/products");

/** A fake Supabase query builder: chainable (every method but the terminal
 *  read returns itself) and thenable (awaiting it resolves to the seeded
 *  result), matching how @supabase/supabase-js's PostgrestFilterBuilder
 *  actually behaves — close enough to exercise products.ts without a real
 *  Supabase project (none exists — see P22/P24 reports). */
function fakeSupabaseFrom(result: { data: unknown; error: unknown }) {
  const insertCalls: unknown[] = [];
  const builder = {
    select: vi.fn(() => builder),
    order: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    single: vi.fn(() => builder),
    insert: vi.fn((row: unknown) => {
      insertCalls.push(row);
      return builder;
    }),
    then: (resolve: (value: typeof result) => void) => resolve(result),
  };
  return { from: vi.fn(() => builder), insertCalls };
}

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

const VALID_INPUT = {
  slug: "eth-001-250g",
  name: "Эфиопия Гуджи 250 г",
  description: "Промытая обработка, жасмин и персик.",
  price: 1490,
  passportPublicId: "LOT-XO-ETH-001",
};

const NOW = "2026-09-12T00:00:00.000Z";

function makeProductRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    slug: VALID_INPUT.slug,
    name: VALID_INPUT.name,
    description: VALID_INPUT.description,
    price: VALID_INPUT.price,
    published: false,
    passport_public_id: VALID_INPUT.passportPublicId,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

describe("src/lib/store/products.ts", () => {
  beforeEach(() => {
    fetchXoRoasterLotsMock.mockReset();
    createSupabaseServerClientMock.mockReset();
  });

  // Test 1 — valid XO Lot allows Product creation.
  it("creates a Product when passportPublicId matches an active XO Lot", async () => {
    fetchXoRoasterLotsMock.mockResolvedValue({ ok: true, lots: [ETH_LOT, COL_LOT] });
    const supa = fakeSupabaseFrom({ data: makeProductRow(), error: null });
    createSupabaseServerClientMock.mockResolvedValue(supa);

    const result = await createStoreProduct(VALID_INPUT);

    expect(result.ok).toBe(true);
    expect(supa.from).toHaveBeenCalledWith("products");
    expect(supa.insertCalls).toHaveLength(1);
  });

  // Test 2 — unknown Lot rejects Product creation, no INSERT attempted.
  it("rejects creation with lot_not_found when passportPublicId matches no active XO Lot, and never inserts", async () => {
    fetchXoRoasterLotsMock.mockResolvedValue({ ok: true, lots: [COL_LOT] });
    const supa = fakeSupabaseFrom({ data: null, error: null });
    createSupabaseServerClientMock.mockResolvedValue(supa);

    const result = await createStoreProduct(VALID_INPUT); // asks for ETH lot, only COL is active

    expect(result).toEqual({
      ok: false,
      error: { kind: "lot_not_found", publicId: "LOT-XO-ETH-001" },
    });
    expect(supa.from).not.toHaveBeenCalled();
  });

  // Test 3 — Passport unavailable rejects Product creation.
  it("rejects creation with passport_unavailable when P24 cannot reach Coffee Passport, and never inserts", async () => {
    fetchXoRoasterLotsMock.mockResolvedValue({ ok: false, error: { kind: "unavailable" } });
    const supa = fakeSupabaseFrom({ data: null, error: null });
    createSupabaseServerClientMock.mockResolvedValue(supa);

    const result = await createStoreProduct(VALID_INPUT);

    expect(result).toEqual({ ok: false, error: { kind: "passport_unavailable" } });
    expect(supa.from).not.toHaveBeenCalled();
  });

  it("also maps not_configured/unauthorized/forbidden to passport_unavailable", async () => {
    for (const kind of ["not_configured", "unauthorized", "forbidden"] as const) {
      fetchXoRoasterLotsMock.mockResolvedValue({ ok: false, error: { kind } });
      const result = await createStoreProduct(VALID_INPUT);
      expect(result).toEqual({ ok: false, error: { kind: "passport_unavailable" } });
    }
  });

  // Test 4 — invalid P23 contract rejects Product creation.
  it("rejects creation with passport_invalid_contract when P24 reports a malformed response, and never inserts", async () => {
    fetchXoRoasterLotsMock.mockResolvedValue({
      ok: false,
      error: { kind: "invalid_contract", detail: "expected a JSON array of lots" },
    });
    const supa = fakeSupabaseFrom({ data: null, error: null });
    createSupabaseServerClientMock.mockResolvedValue(supa);

    const result = await createStoreProduct(VALID_INPUT);

    expect(result).toEqual({
      ok: false,
      error: {
        kind: "passport_invalid_contract",
        detail: "expected a JSON array of lots",
      },
    });
    expect(supa.from).not.toHaveBeenCalled();
  });

  // Test 5 — created Product's passportPublicId comes from the validated input.
  it("stores passportPublicId exactly as validated, not derived from slug/name", async () => {
    fetchXoRoasterLotsMock.mockResolvedValue({ ok: true, lots: [ETH_LOT] });
    const supa = fakeSupabaseFrom({ data: makeProductRow(), error: null });
    createSupabaseServerClientMock.mockResolvedValue(supa);

    const result = await createStoreProduct(VALID_INPUT);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.passportPublicId).toBe("LOT-XO-ETH-001");
    expect(supa.insertCalls[0]).toMatchObject({ passport_public_id: "LOT-XO-ETH-001" });
  });

  // Test 6 — new Product always gets published = false.
  it("always inserts published: false, regardless of input (the field does not even exist on input)", async () => {
    fetchXoRoasterLotsMock.mockResolvedValue({ ok: true, lots: [ETH_LOT] });
    const supa = fakeSupabaseFrom({ data: makeProductRow(), error: null });
    createSupabaseServerClientMock.mockResolvedValue(supa);

    const result = await createStoreProduct(VALID_INPUT);

    expect(supa.insertCalls[0]).toMatchObject({ published: false });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.published).toBe(false);
  });

  // Test 7 — the integration secret is never touched or exposed by this layer.
  it("never reads the Coffee Passport secret directly — all Passport access goes through P24's client", () => {
    const filePath = fileURLToPath(new URL("./products.ts", import.meta.url));
    const source = readFileSync(filePath, "utf8");
    expect(source.includes("COFFEE_PASSPORT_INTEGRATION_SECRET")).toBe(false);
    expect(source.includes("process.env")).toBe(false);
  });

  // Test 8 — multiple Products may reference the same Lot; no unintended
  // uniqueness is enforced by this layer.
  it("lists more than one Product for the same passportPublicId without deduplication or error", async () => {
    const rowA = makeProductRow({ id: "a", slug: "eth-001-250g" });
    const rowB = makeProductRow({ id: "b", slug: "eth-001-1kg", price: 4200 });
    const supa = fakeSupabaseFrom({ data: [rowA, rowB], error: null });
    createSupabaseServerClientMock.mockResolvedValue(supa);

    const result = await listStoreProductsByPassportPublicId("LOT-XO-ETH-001");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(2);
      expect(result.value.map((p) => p.slug)).toEqual(["eth-001-250g", "eth-001-1kg"]);
    }
  });

  it("maps a unique-constraint violation on slug to a conflict error", async () => {
    fetchXoRoasterLotsMock.mockResolvedValue({ ok: true, lots: [ETH_LOT] });
    const supa = fakeSupabaseFrom({
      data: null,
      error: { code: "23505", message: "duplicate key value violates unique constraint" },
    });
    createSupabaseServerClientMock.mockResolvedValue(supa);

    const result = await createStoreProduct(VALID_INPUT);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("conflict");
  });

  it("rejects invalid input before ever calling Passport or the database", async () => {
    const result = await createStoreProduct({ ...VALID_INPUT, price: -5 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("invalid_input");
    expect(fetchXoRoasterLotsMock).not.toHaveBeenCalled();
    expect(createSupabaseServerClientMock).not.toHaveBeenCalled();
  });
});
