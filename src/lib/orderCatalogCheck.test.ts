import { describe, expect, it } from "vitest";
import { findCatalogDiscrepancies } from "@/src/lib/orderCatalogCheck";
import type { Lot } from "@/src/types/lot";
import type { OrderPayloadItem } from "@/src/types/order";

const lot = {
  id: "lot-1",
  name: "Ethiopia",
  price: 1490,
  variants: [{ id: "var-250", weightGrams: 250, price: 1490, availableForOrder: true }],
} as Lot;

function item(overrides: Partial<OrderPayloadItem> = {}): OrderPayloadItem {
  return {
    lotId: "lot-1",
    variantId: "var-250",
    name: "Ethiopia",
    weightGrams: 250,
    quantity: 1,
    price: 1490,
    packaging: "whole-bean",
    ...overrides,
  };
}

describe("findCatalogDiscrepancies", () => {
  it("returns no warnings when the variant, price and weight match the catalog", () => {
    expect(findCatalogDiscrepancies([item()], [lot])).toEqual([]);
  });

  it("warns when the order price differs from the variant's catalog price", () => {
    const warnings = findCatalogDiscrepancies([item({ price: 1 })], [lot]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("Ethiopia");
  });

  it("warns when the packaging weight differs from the catalog", () => {
    expect(findCatalogDiscrepancies([item({ weightGrams: 1000 })], [lot])).toHaveLength(1);
  });

  it("warns when the variant is not in the published catalog", () => {
    expect(findCatalogDiscrepancies([item({ variantId: "gone" })], [lot])).toHaveLength(1);
  });
});
