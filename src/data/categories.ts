export const REGION_COUNTRIES = ["Колумбия", "Эфиопия", "Гватемала", "Перу"] as const;

export type RegionCountry = (typeof REGION_COUNTRIES)[number];

// "merch" stays in the type so the id remains valid to reintroduce later —
// it is deliberately left out of TOP_CATEGORIES below because the category
// has no products yet and an empty tab reads as an unfinished site.
export type TopCategoryId = "all" | "region" | "specialty-set" | "merch";

export const TOP_CATEGORIES: { id: TopCategoryId; label: string }[] = [
  { id: "all", label: "Все лоты" },
  { id: "region", label: "По региону" },
  { id: "specialty-set", label: "Спешелти-наборы" },
];
