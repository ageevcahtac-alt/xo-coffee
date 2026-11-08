import { describe, expect, it } from "vitest";
import { mapAdminProductToLot } from "@/src/lib/store/catalog";
import { addCartItem, buildCartItem } from "@/src/lib/cartItems";
import { mergeOrderItemsByLot } from "@/src/lib/coffeePassport";
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

describe("mergeOrderItemsByLot", () => {
  it("an order of 250 g + 1 kg yields ONE summary entry with the quantities summed", () => {
    let cart = addCartItem([], buildCartItem(colombia, colombia.variants![0]));
    cart = addCartItem(cart, buildCartItem(colombia, colombia.variants![1]), 2);
    expect(cart).toHaveLength(2); // two commercial lines...

    const merged = mergeOrderItemsByLot(
      cart.map((i) => ({ lotId: i.productId, name: i.name, quantity: i.quantity })),
    );
    expect(merged).toEqual([{ lotId: colombia.id, name: "Colombia Huila", quantity: 3 }]); // ...one coffee
  });

  it("keeps different lots as separate entries, in first-seen order", () => {
    const other = { ...colombia, id: "lot-other", name: "Ethiopia Guji" };
    const merged = mergeOrderItemsByLot([
      { lotId: colombia.id, name: colombia.name, quantity: 1 },
      { lotId: other.id, name: other.name, quantity: 2 },
      { lotId: colombia.id, name: colombia.name, quantity: 1 },
    ]);
    expect(merged).toEqual([
      { lotId: colombia.id, name: colombia.name, quantity: 2 },
      { lotId: other.id, name: other.name, quantity: 2 },
    ]);
  });
});
