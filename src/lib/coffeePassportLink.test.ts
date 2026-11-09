import { describe, expect, it } from "vitest";
import { mapAdminProductToLot } from "@/src/lib/store/catalog";
import {
  DEFAULT_COFFEE_PASSPORT_PUBLIC_BASE,
  getCoffeePassportUrl,
} from "@/src/lib/coffeePassportLink";
import type { AdminStoreProduct } from "@/src/lib/integrations/adminStoreClient";

const V250 = "11111111-1111-4111-8111-111111111111";
const V1000 = "22222222-2222-4222-8222-222222222222";
const PUBLIC_ID = "LOT-XO-COL-004";

const colombia = mapAdminProductToLot({
  id: "0b6f3c1e-1111-4222-8333-444455556666",
  slug: "colombia-huila",
  name: "Colombia Huila",
  description: null,
  price: 1000,
  passport_public_id: PUBLIC_ID,
  updated_at: "2026-09-21T10:00:00.000Z",
  variants: [
    { id: V250, weight_grams: 250, price: 1000, available_for_order: true },
    { id: V1000, weight_grams: 1000, price: 3600, available_for_order: true },
  ],
} as AdminStoreProduct);

describe("getCoffeePassportUrl", () => {
  it("addresses the Coffee Passport lot by the Canonical Lot's passport_public_id", () => {
    expect(colombia.variants).toHaveLength(2);
    expect(colombia.passportPublicId).toBe(PUBLIC_ID);

    const link = getCoffeePassportUrl(colombia);
    expect(link).toBe(`${DEFAULT_COFFEE_PASSPORT_PUBLIC_BASE}/passport/${PUBLIC_ID}`);
    expect(link).not.toContain(V250);
    expect(link).not.toContain(V1000);
    expect(link).not.toContain(colombia.id);
  });

  it("gives no link (rather than a guessed one) for a lot without a passport_public_id", () => {
    const bare = { ...colombia, passportPublicId: undefined };
    expect(getCoffeePassportUrl(bare)).toBeNull();
  });

  it("honours the server-provided base but keeps the /passport/<id> path", () => {
    expect(getCoffeePassportUrl(colombia, "https://cp.example.test")).toBe(
      `https://cp.example.test/passport/${PUBLIC_ID}`,
    );
    // trailing slashes on the base are normalized away, never doubled
    expect(getCoffeePassportUrl(colombia, "https://cp.example.test/")).toBe(
      `https://cp.example.test/passport/${PUBLIC_ID}`,
    );
  });

  it("falls back to the default base when the server provides none", () => {
    expect(getCoffeePassportUrl(colombia, undefined)).toBe(
      `${DEFAULT_COFFEE_PASSPORT_PUBLIC_BASE}/passport/${PUBLIC_ID}`,
    );
    expect(getCoffeePassportUrl(colombia, "   ")).toBe(
      `${DEFAULT_COFFEE_PASSPORT_PUBLIC_BASE}/passport/${PUBLIC_ID}`,
    );
  });

  it("URL-encodes the public id", () => {
    const spaced = { ...colombia, passportPublicId: "LOT XO/COL 004" };
    expect(getCoffeePassportUrl(spaced)).toBe(
      `${DEFAULT_COFFEE_PASSPORT_PUBLIC_BASE}/passport/${encodeURIComponent("LOT XO/COL 004")}`,
    );
  });
});
