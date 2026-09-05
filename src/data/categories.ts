export const REGION_COUNTRIES = ["Колумбия", "Эфиопия", "Гватемала", "Перу"] as const;

export type RegionCountry = (typeof REGION_COUNTRIES)[number];

export type TopCategoryId = "all" | "region" | "specialty-set" | "merch";

export const TOP_CATEGORIES: { id: TopCategoryId; label: string }[] = [
  { id: "all", label: "Все лоты" },
  { id: "region", label: "По региону" },
  { id: "specialty-set", label: "Спешелти-наборы" },
  { id: "merch", label: "Аксессуары & Мерч" },
];
