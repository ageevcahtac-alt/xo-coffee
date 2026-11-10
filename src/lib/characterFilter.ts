import type { Lot } from "@/src/types/lot";

/** Сколько лотов показываем по выбранному характеру до строки «и ещё N». */
export const CHARACTER_PREVIEW_LIMIT = 3;

/** Регистронезависимый текст для матча: нижний регистр, «ё» = «е». */
export function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(/ё/g, "е");
}

/** Все текстовые поля лота, по которым ищет фильтр характера. */
export function lotCharacterText(lot: Lot): string {
  return [
    lot.name,
    ...lot.tags,
    ...lot.sensory,
    lot.cupNote,
    lot.farmStory,
    lot.description,
  ]
    .filter((part): part is string => typeof part === "string" && part.length > 0)
    .join(" ");
}

/** Сколько корней словаря встречаются в тексте лота (0 — лот не подходит). */
export function countCharacterMatches(lot: Lot, keywords: readonly string[]): number {
  if (keywords.length === 0) return 0;
  const text = normalizeSearchText(lotCharacterText(lot));
  return keywords.reduce(
    (count, keyword) => count + (text.includes(normalizeSearchText(keyword)) ? 1 : 0),
    0,
  );
}

/**
 * Лоты, подходящие под выбранный характер: только лоты с хотя бы одним
 * совпадением корня. Сортировка по убыванию числа совпадений (лоты с 2–3
 * совпадениями выше, с одним — ниже); при равенстве — исходный порядок
 * каталога, чтобы выдача была стабильной.
 */
export function filterLotsByCharacter(lots: Lot[], keywords: readonly string[]): Lot[] {
  return lots
    .map((lot, index) => ({ lot, index, matches: countCharacterMatches(lot, keywords) }))
    .filter((entry) => entry.matches > 0)
    .sort((a, b) => (b.matches !== a.matches ? b.matches - a.matches : a.index - b.index))
    .map(({ lot }) => lot);
}
