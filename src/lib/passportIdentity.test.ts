import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mapAdminProductToLot } from "@/src/lib/store/catalog";
import { addCartItem, buildCartItem } from "@/src/lib/cartItems";
import { buildAdminOrderRequest } from "@/src/lib/checkout/adminOrderRequest";
import {
  DEFAULT_COFFEE_PASSPORT_LOT_URL_TEMPLATE,
  getCoffeePassportUrl,
} from "@/src/lib/coffeePassportLink";
import { getPassportContinuation } from "@/src/lib/passportContinuation";
import {
  createTastingId,
  getOrderRecord,
  getTastingRecordsForLot,
  mergeOrderItemsByLot,
  saveOrderRecord,
  saveTastingRecord,
} from "@/src/lib/coffeePassport";
import type { AdminStoreProduct } from "@/src/lib/integrations/adminStoreClient";
import type { OrderPayloadItem } from "@/src/types/order";

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

/** Minimal in-memory localStorage so the browser-only Passport store runs under node. */
function stubBrowserStorage() {
  const data = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    },
  });
  return data;
}

beforeEach(() => {
  stubBrowserStorage();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("A/B. one Canonical Lot, however many packagings", () => {
  it("250 g and 1 kg belong to one product with ONE passport_public_id", () => {
    expect(colombia.variants).toHaveLength(2);
    expect(colombia.passportPublicId).toBe(PUBLIC_ID);
  });

  it("both packagings resolve to the identical Coffee Passport link (the public id, not a variant id)", () => {
    const link = getCoffeePassportUrl(colombia);
    expect(link).toBe(`https://coffee-passport.onrender.com/passport/${PUBLIC_ID}`);
    expect(link).not.toContain(V250);
    expect(link).not.toContain(V1000);
    expect(link).not.toContain(colombia.id);
  });

  it("an order of 250 g + 1 kg yields ONE Passport entry with the quantities summed", () => {
    let cart = addCartItem([], buildCartItem(colombia, colombia.variants![0]));
    cart = addCartItem(cart, buildCartItem(colombia, colombia.variants![1]), 2);
    expect(cart).toHaveLength(2); // two commercial lines...

    const merged = mergeOrderItemsByLot(
      cart.map((i) => ({ lotId: i.productId, name: i.name, quantity: i.quantity })),
    );
    expect(merged).toEqual([{ lotId: colombia.id, name: "Colombia Huila", quantity: 3 }]); // ...one coffee
  });

  it("saveOrderRecord stores one item per lot, and repairs an older record that held two", () => {
    saveOrderRecord({
      orderNumber: "XO-1",
      createdAt: "2026-09-21T10:00:00.000Z",
      items: [
        { lotId: colombia.id, name: "Colombia Huila", quantity: 1 },
        { lotId: colombia.id, name: "Colombia Huila", quantity: 2 },
      ],
    });
    expect(getOrderRecord("XO-1")?.items).toEqual([
      { lotId: colombia.id, name: "Colombia Huila", quantity: 3 },
    ]);
  });
});

describe("C. variant_id stays in the commercial record", () => {
  it("the Admin order keeps one line per variant while the lot identity stays shared", () => {
    const items: OrderPayloadItem[] = colombia.variants!.map((v) => ({
      lotId: colombia.id,
      variantId: v.id,
      name: colombia.name,
      weightGrams: v.weightGrams,
      quantity: 1,
      price: v.price,
      packaging: "whole-bean",
    }));
    expect(new Set(items.map((i) => i.lotId)).size).toBe(1);
    expect(
      buildAdminOrderRequest({ name: "n", phone: "p", email: "e", items }).items,
    ).toEqual([
      { variant_id: V250, quantity: 1 },
      { variant_id: V1000, quantity: 1 },
    ]);
  });
});

describe("D. the post-purchase flow keys on the Canonical Lot", () => {
  it("the order record carries the lot id and no variant id", () => {
    saveOrderRecord({
      orderNumber: "XO-2",
      createdAt: "2026-09-21T10:00:00.000Z",
      items: [{ lotId: colombia.id, name: colombia.name, quantity: 1 }],
    });
    const stored = JSON.stringify(getOrderRecord("XO-2"));
    expect(stored).not.toContain(V250);
    expect(stored).not.toContain(V1000);
    expect(stored).not.toMatch(/variant/i);
  });

  it("PaymentStep builds the record through mergeOrderItemsByLot", () => {
    const source = readFileSync(
      path.resolve(__dirname, "../components/cart/PaymentStep.tsx"),
      "utf8",
    );
    expect(source).toContain("mergeOrderItemsByLot(");
  });
});

describe("E. the first tasting is saved", () => {
  it("round-trips, and both packagings' tasting land on the one lot", () => {
    saveTastingRecord({
      id: createTastingId(colombia.id),
      orderNumber: "XO-2",
      lotId: colombia.id,
      brewMethod: "v60",
      rating: { acidity: 4, sweetness: 3, body: 3, overall: 5 },
      note: "яркая",
      createdAt: "2026-09-21T11:00:00.000Z",
    });
    const records = getTastingRecordsForLot(colombia.id);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ lotId: colombia.id, note: "яркая", rating: { overall: 5 } });
  });
});

describe("F/G/H/I. what follows the saved tasting", () => {
  it("offers 'Продолжить в Coffee Passport' straight to the existing Canonical Lot", () => {
    const next = getPassportContinuation(colombia)!;
    expect(next.ctaLabel).toBe("Продолжить в Coffee Passport");
    expect(next.href).toBe(getCoffeePassportUrl(colombia));
    expect(next.href.endsWith(`/passport/${PUBLIC_ID}`)).toBe(true);
    expect(next.headline).toMatch(/сохранена/);
  });

  it("explains the sign-in value without a wall: the tasting is already saved, the CTA is a plain link", () => {
    const next = getPassportContinuation(colombia)!;
    expect(next.benefits.join(" ")).toMatch(/история дегустаций|историю дегустаций/);
    expect(next.benefits.length).toBeGreaterThanOrEqual(4);
    // saved before/independently of the CTA
    expect(getTastingRecordsForLot(colombia.id)).toEqual([]);
    saveTastingRecord({
      id: "t1",
      orderNumber: "XO-3",
      lotId: colombia.id,
      brewMethod: "other",
      rating: { acidity: 3, sweetness: 3, body: 3, overall: 3 },
      note: "",
      createdAt: "2026-09-21T11:00:00.000Z",
    });
    expect(getTastingRecordsForLot(colombia.id)).toHaveLength(1);
  });

  it("gives no link (rather than a guessed one) for a lot without a passport_public_id", () => {
    const bare = { ...colombia, passportPublicId: undefined };
    expect(getCoffeePassportUrl(bare)).toBeNull();
    expect(getPassportContinuation(bare)).toBeNull();
  });

  it("honours a configured URL template but still substitutes the public id", () => {
    expect(getCoffeePassportUrl(colombia, "https://cp.example.test/l/{lotId}")).toBe(
      `https://cp.example.test/l/${PUBLIC_ID}`,
    );
    // a template without the placeholder is ignored, never used to build a wrong link
    expect(getCoffeePassportUrl(colombia, "https://cp.example.test/")).toBe(
      DEFAULT_COFFEE_PASSPORT_LOT_URL_TEMPLATE.replace("{lotId}", PUBLIC_ID),
    );
  });
});

describe("J. Store keeps no copy of a Passport lot", () => {
  it("the Passport record types hold ids and the buyer's own tasting only", () => {
    saveOrderRecord({
      orderNumber: "XO-4",
      createdAt: "2026-09-21T10:00:00.000Z",
      items: [{ lotId: colombia.id, name: colombia.name, quantity: 1 }],
    });
    const stored = JSON.stringify(getOrderRecord("XO-4"));
    expect(stored).not.toContain(PUBLIC_ID);
    expect(stored).not.toMatch(/passport_public_id|passportPublicId|flavor|farm/i);
  });

  it("never writes to Coffee Passport: the link builder is the only bridge and it only builds a URL", () => {
    const source = readFileSync(path.resolve(__dirname, "coffeePassportLink.ts"), "utf8");
    expect(source).not.toMatch(/fetch\(|supabase|\.insert\(|POST/);
  });
});
