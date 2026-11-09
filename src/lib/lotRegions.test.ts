import { describe, expect, it } from "vitest";
import {
  buildRegionChips,
  filterLotsByRegion,
  regionFromLotName,
  resolveLotRegion,
} from "@/src/lib/lotRegions";

describe("regionFromLotName", () => {
  it.each([
    ["Эфиопия Гуджи", "ethiopia"],
    ["эфиопия гуджи", "ethiopia"],
    ["Кения АА", "kenya"],
    ["Колумбия Ла Пальма", "colombia"],
    ["Коста-Рика Ла Фанта", "costa-rica"],
    ["Бразилия Серрадо", "brazil"],
  ])("maps «%s» to slug %s by first word", (name, slug) => {
    expect(regionFromLotName(name)?.slug).toBe(slug);
  });

  it("ignores leading quotes and trailing punctuation", () => {
    expect(regionFromLotName("«Эфиопия» Гуджи")?.slug).toBe("ethiopia");
    expect(regionFromLotName("Эфиопия,")?.slug).toBe("ethiopia");
  });

  it.each([["Бленд № 7"], ["Эспрессо «Ноль»"], ["Лот № 014"], [""], ["   "]])(
    "returns null for a non-origin name like «%s»",
    (name) => {
      expect(regionFromLotName(name)).toBeNull();
    },
  );
});

describe("resolveLotRegion (external country string)", () => {
  it("matches an English alias from Coffee Passport", () => {
    expect(resolveLotRegion("Ethiopia")?.slug).toBe("ethiopia");
    expect(resolveLotRegion("Colombia")?.slug).toBe("colombia");
  });

  it("takes the first word when the country string carries more", () => {
    expect(resolveLotRegion("Эфиопия, зона Гуджи")?.slug).toBe("ethiopia");
  });

  it.each([[null], [undefined], [""], ["Atlantis"]])(
    "returns null for %j",
    (input) => {
      expect(resolveLotRegion(input)).toBeNull();
    },
  );
});

describe("buildRegionChips", () => {
  const eth = { label: "Эфиопия", slug: "ethiopia" };
  const col = { label: "Колумбия", slug: "colombia" };

  it("builds chips only from origins present, with counts, no duplicates", () => {
    const chips = buildRegionChips([
      { origin: eth },
      { origin: eth },
      { origin: null },
      { origin: col },
    ]);
    expect(chips).toEqual([
      { ...eth, count: 2 },
      { ...col, count: 1 },
    ]);
  });

  it("returns an empty list when no lot has an origin (no empty chips)", () => {
    expect(buildRegionChips([{ origin: null }, {}])).toEqual([]);
  });

  it("breaks count ties by label (ru locale)", () => {
    const chips = buildRegionChips([{ origin: eth }, { origin: col }]);
    expect(chips.map((c) => c.slug)).toEqual(["colombia", "ethiopia"]);
  });
});

describe("filterLotsByRegion", () => {
  it("keeps only lots of the requested slug and never drops others from the caller", () => {
    const lots = [
      { id: "1", origin: { label: "Эфиопия", slug: "ethiopia" } },
      { id: "2", origin: null },
      { id: "3", origin: { label: "Колумбия", slug: "colombia" } },
    ];
    expect(filterLotsByRegion(lots, "ethiopia").map((l) => l.id)).toEqual(["1"]);
    expect(lots).toHaveLength(3);
  });
});
