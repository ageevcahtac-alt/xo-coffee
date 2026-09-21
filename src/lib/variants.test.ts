import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAdminPublishedProducts, getAdminOrdersUrl } from "@/src/lib/integrations/adminStoreClient";
import { getCatalog, mapAdminProductToLot } from "@/src/lib/store/catalog";
import { reconcileCartItems } from "@/src/lib/cartReconcile";
import {
  addCartItem,
  buildCartItem,
  isValidCartItem,
  type CartItem,
} from "@/src/lib/cartItems";
import {
  formatVariantLabel,
  formatWeight,
  getLotPriceLabel,
  getOrderableVariants,
  resolveVariant,
} from "@/src/lib/variants";
import type { AdminStoreProduct } from "@/src/lib/integrations/adminStoreClient";

const V250 = "11111111-1111-4111-8111-111111111111";
const V1000 = "22222222-2222-4222-8222-222222222222";

// Wire shape as Admin's toStoreProduct sends it — plus a stock_units field,
// which the real feed never sends, to prove Store would drop it anyway.
const wireProduct = {
  id: "0b6f3c1e-1111-4222-8333-444455556666",
  slug: "ethiopia-guji",
  name: "Эфиопия Гуджи",
  description: null,
  price: 1234,
  passport_public_id: "LOT-XO-ETH-001",
  updated_at: "2026-09-21T10:00:00.000Z",
  variants: [
    { id: V1000, weight_grams: 1000, price: 4200, available_for_order: true, stock_units: 0 },
    { id: V250, weight_grams: 250, price: 1234, available_for_order: true, stock_units: 40 },
  ],
};

const asAdmin = (product: unknown) => product as AdminStoreProduct;
const norm = (text: string) => text.replace(/\s/g, " ");

describe("A. a product with two packagings", () => {
  const lot = mapAdminProductToLot(asAdmin(wireProduct));

  it("maps both variants, lightest first, as packagings of ONE product", () => {
    expect(lot.variants?.map((v) => v.weightGrams)).toEqual([250, 1000]);
    expect(lot.id).toBe(wireProduct.id);
  });

  it("labels them by weight and price", () => {
    expect(lot.variants?.map((v) => norm(formatVariantLabel(v)))).toEqual([
      "250 г — 1 234 ₽",
      "1 кг — 4 200 ₽",
    ]);
    expect(norm(getLotPriceLabel(lot) ?? "")).toBe("от 1 234 ₽");
  });

  it("formats weights", () => {
    expect(formatWeight(250)).toBe("250 г");
    expect(formatWeight(1000)).toBe("1 кг");
  });

  it("invents nothing for a product without packagings (the published Guji before Admin adds one)", () => {
    const bare = mapAdminProductToLot(asAdmin({ ...wireProduct, variants: undefined }));
    expect(bare.variants).toEqual([]);
    expect(getOrderableVariants(bare)).toEqual([]);
    expect(resolveVariant(bare)).toBeNull();
    expect(getLotPriceLabel(bare)).toBeNull();
  });
});

describe("B/C. the cart carries the selected variant", () => {
  const lot = mapAdminProductToLot(asAdmin(wireProduct));
  const [small, large] = lot.variants!;

  it("stores product_id, variant_id, quantity and the variant's own price/weight", () => {
    const items = addCartItem([], buildCartItem(lot, large), 2);
    expect(items).toEqual([
      {
        productId: lot.id,
        variantId: V1000,
        name: lot.name,
        country: lot.country,
        weightGrams: 1000,
        price: 4200,
        quantity: 2,
      },
    ]);
  });

  it("keeps two packagings of one product as two lines, and merges the same packaging", () => {
    let items = addCartItem([], buildCartItem(lot, small));
    items = addCartItem(items, buildCartItem(lot, large));
    items = addCartItem(items, buildCartItem(lot, small));
    expect(items.map((i) => [i.variantId, i.quantity])).toEqual([
      [V250, 2],
      [V1000, 1],
    ]);
  });

  it("shows the price of the selected packaging", () => {
    expect(resolveVariant(lot, V1000)?.price).toBe(4200);
    expect(resolveVariant(lot, V250)?.price).toBe(1234);
    expect(resolveVariant(lot, "stale-id")?.id).toBe(V250);
  });

  it("drops a persisted line that has no variantId instead of guessing one", () => {
    const legacy = { id: lot.id, name: lot.name, country: "", price: 1234, quantity: 1 };
    expect(isValidCartItem(legacy)).toBe(false);
  });

  it("reconcile matches by variantId, refreshes price and drops vanished packagings", () => {
    const items: CartItem[] = [
      { ...buildCartItem(lot, small), price: 1, quantity: 1 },
      { ...buildCartItem(lot, large), variantId: "gone", quantity: 1 },
    ];
    expect(reconcileCartItems(items, [lot])).toEqual([{ ...buildCartItem(lot, small), quantity: 1 }]);
    const same = [{ ...buildCartItem(lot, small), quantity: 1 }];
    expect(reconcileCartItems(same, [lot])).toBe(same);
  });
});

describe("D. stock never reaches the Store", () => {
  const fetchMock = vi.fn();
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("drops stock_units from the parsed feed and from the catalog handed to the browser", async () => {
    vi.stubEnv("ADMIN_INTEGRATION_URL", "https://admin.example.test/api/integrations/xo-store/products");
    vi.stubEnv("ADMIN_INTEGRATION_SECRET", "s");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ products: [wireProduct] })));

    const feed = await fetchAdminPublishedProducts();
    expect(feed.ok).toBe(true);
    expect(JSON.stringify(feed)).not.toMatch(/stock/i);

    const catalog = await getCatalog();
    expect(catalog.status).toBe("ok");
    expect(JSON.stringify(catalog)).not.toMatch(/stock/i);
  });

  it("has no stock figure anywhere in the buyer-facing UI source", () => {
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((name) => {
        const full = path.join(dir, name);
        return statSync(full).isDirectory() ? walk(full) : [full];
      });
    const files = walk(path.resolve(__dirname, "../components")).filter((f) => f.endsWith(".tsx"));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(/stock|в наличии|под заказ/i);
    }
  });
});

describe("E. zero stock does not block ordering", () => {
  it("a variant Admin marks available_for_order stays orderable even though its raw stock is 0", () => {
    // wireProduct's 1 кг variant carries stock_units: 0 in the raw feed.
    const lot = mapAdminProductToLot(asAdmin(wireProduct));
    const large = lot.variants!.find((v) => v.id === V1000)!;
    expect(large.availableForOrder).toBe(true);
    expect(getOrderableVariants(lot)).toContain(large);
    expect(resolveVariant(lot, V1000)).toBe(large);
  });

  it("only Admin's flag can make a packaging unorderable", () => {
    const lot = mapAdminProductToLot(
      asAdmin({
        ...wireProduct,
        variants: [{ id: V250, weight_grams: 250, price: 1, available_for_order: false }],
      }),
    );
    expect(getOrderableVariants(lot)).toEqual([]);
  });
});

describe("Admin orders URL", () => {
  it("is derived from the products URL already in ADMIN_INTEGRATION_URL", () => {
    expect(getAdminOrdersUrl("https://xo-coffee-admin.onrender.com/api/integrations/xo-store/products")).toBe(
      "https://xo-coffee-admin.onrender.com/api/integrations/xo-store/orders",
    );
  });

  it("is never guessed from a URL that isn't a products endpoint", () => {
    expect(getAdminOrdersUrl("https://admin.example.test/something")).toBeNull();
    expect(getAdminOrdersUrl(undefined)).toBeNull();
    expect(getAdminOrdersUrl("not a url")).toBeNull();
  });
});
