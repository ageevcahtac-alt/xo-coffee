import { describe, expect, it } from "vitest";
import { mapAdminProductToLot } from "@/src/lib/store/catalog";
import { getCoffeePassportUrl } from "@/src/lib/coffeePassportLink";
import { getPassportContinuation } from "@/src/lib/passportContinuation";
import type { AdminStoreProduct } from "@/src/lib/integrations/adminStoreClient";
import type { TastingRecord } from "@/src/types/coffeePassport";

const V250 = "11111111-1111-4111-8111-111111111111";
const V1000 = "22222222-2222-4222-8222-222222222222";
const PUBLIC_ID = "LOT-XO-COL-004";
const PLAIN = `https://coffee-passport.onrender.com/passport/${PUBLIC_ID}`;

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

const RECORD_ID = `${colombia.id}-33333333-3333-4333-8333-333333333333`;

function tasting(over: Partial<TastingRecord> = {}): TastingRecord {
  return {
    id: RECORD_ID,
    orderNumber: "XO-777",
    lotId: colombia.id,
    brewMethod: "v60",
    rating: { acidity: 3, sweetness: 4, body: 3, overall: 5 },
    note: "яркая, с «персиком» & 100%",
    createdAt: "2026-09-21T11:00:00.000Z",
    ...over,
  };
}

const hrefFor = (record?: TastingRecord | null) => getPassportContinuation(colombia, record)!.href;
const fragmentOf = (href: string) => new URLSearchParams(new URL(href).hash.slice(1));

describe("tasting handoff to Coffee Passport (contract v1)", () => {
  it("A. the CTA targets the lot's passport_public_id with the fragment appended", () => {
    expect(hrefFor(tasting()).startsWith(`${PLAIN}#src=xo-store&v=1&`)).toBe(true);
  });

  it("B. the fragment carries the real saved values", () => {
    expect(Object.fromEntries(fragmentOf(hrefFor(tasting())))).toMatchObject({
      src: "xo-store",
      v: "1",
      acidity: "3",
      sweetness: "4",
      body: "3",
      overall: "5",
      brew: "v60",
      note: "яркая, с «персиком» & 100%",
    });
    const other = fragmentOf(
      hrefFor(
        tasting({
          rating: { acidity: 1, sweetness: 2, body: 1, overall: 2 },
          brewMethod: "other",
          note: "",
        }),
      ),
    );
    expect(Object.fromEntries(other)).toMatchObject({
      acidity: "1",
      sweetness: "2",
      body: "1",
      overall: "2",
      brew: "custom",
    });
    expect(other.has("note")).toBe(false); // optional field left empty is not sent
  });

  it("C. id is stable per saved rating, fits the contract, and differs between ratings", () => {
    const id = (record: TastingRecord) => fragmentOf(hrefFor(record)).get("id");
    expect(id(tasting())).toBe(id(tasting()));
    expect(id(tasting())).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
    expect(id(tasting({ id: `${colombia.id}-44444444-4444-4444-8444-444444444444` }))).not.toBe(
      id(tasting()),
    );
    // editing the same saved rating keeps its record id, hence its key
    expect(id(tasting({ note: "правка" }))).toBe(id(tasting()));
  });

  it("D. the note is URL-encoded in the raw fragment and round-trips", () => {
    const href = hrefFor(tasting({ note: "a&b=c #d\nе" }));
    const raw = href.slice(href.indexOf("#"));
    expect(raw).not.toMatch(/note=[^&]*[ #\n]/);
    expect(fragmentOf(href).get("note")).toBe("a&b=c #d\nе");
  });

  it("D2. an over-long note is cut to the 500 characters Coffee Passport accepts", () => {
    expect(fragmentOf(hrefFor(tasting({ note: "я".repeat(900) }))).get("note")).toHaveLength(500);
  });

  it("E. nothing personal or commercial is in the fragment", () => {
    const href = hrefFor(tasting());
    const raw = decodeURIComponent(href.slice(href.indexOf("#")));
    for (const banned of [V250, V1000, "XO-777", colombia.id, "phone", "email", "price", "stock", "variant", "order"]) {
      expect(raw).not.toContain(banned);
    }
    expect([...fragmentOf(href).keys()].sort()).toEqual(
      ["acidity", "body", "brew", "id", "note", "overall", "sweetness", "src", "v"].sort(),
    );
  });

  it("F. 250 g and 1 kg of one Canonical Lot give one and the same Passport URL", () => {
    expect(colombia.variants).toHaveLength(2);
    // the URL is built from the lot and the rating only — packaging is not an input
    expect(hrefFor(tasting()).split("#")[0]).toBe(PLAIN);
    expect(hrefFor(tasting())).toBe(hrefFor(tasting()));
  });

  it("G. no saved tasting (or an invalid one) -> the plain lot link, no invented rating", () => {
    expect(hrefFor()).toBe(PLAIN);
    expect(hrefFor(null)).toBe(PLAIN);
    expect(hrefFor(tasting({ rating: { acidity: 0, sweetness: 4, body: 3, overall: 5 } }))).toBe(PLAIN);
    expect(hrefFor(tasting({ rating: { acidity: 3.5, sweetness: 4, body: 3, overall: 5 } }))).toBe(PLAIN);
  });

  it("builds on the configured template's base, not a hardcoded host", () => {
    expect(getCoffeePassportUrl(colombia, "https://cp.example.test/l/{lotId}")).toBe(
      `https://cp.example.test/l/${PUBLIC_ID}`,
    );
  });
});
