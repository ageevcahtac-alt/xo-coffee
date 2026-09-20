import { describe, expect, it } from "vitest";
import { findCatalogDiscrepancies } from "@/src/lib/orderCatalogCheck";
import type { Lot } from "@/src/types/lot";
import type { OrderPayloadItem } from "@/src/types/order";

const lot = { id: "lot-1", name: "Ethiopia", price: 1490 } as Lot;

function item(overrides: Partial<OrderPayloadItem> = {}): OrderPayloadItem {
  return { lotId: "lot-1", name: "Ethiopia", quantity: 1, price: 1490, packaging: "whole-bean", ...overrides };
}

describe("findCatalogDiscrepancies", () => {
  it("returns no warnings when ids and prices match the catalog", () => {
    expect(findCatalogDiscrepancies([item()], [lot])).toEqual([]);
  });

  it("warns when the order price differs from the catalog price", () => {
    const warnings = findCatalogDiscrepancies([item({ price: 1 })], [lot]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("Ethiopia");
  });

  it("warns when the lot is not in the published catalog", () => {
    expect(findCatalogDiscrepancies([item({ lotId: "gone" })], [lot])).toHaveLength(1);
  });
});
