import { describe, expect, it } from "vitest";
import type { Lot } from "@/src/types/lot";
import {
  CHARACTER_PREVIEW_LIMIT,
  countCharacterMatches,
  filterLotsByCharacter,
  normalizeSearchText,
} from "@/src/lib/characterFilter";

function makeLot(overrides: Partial<Lot> & { id: string }): Lot {
  return {
    name: overrides.id,
    category: "filter",
    tags: [],
    country: "Test",
    region: "Test",
    sensory: [],
    price: 1000,
    ...overrides,
  };
}

describe("normalizeSearchText", () => {
  it("приводит к нижнему регистру и складывает «ё» с «е»", () => {
    expect(normalizeSearchText("Тёмный МЁД Жасмин")).toBe("темный мед жасмин");
  });
});

describe("countCharacterMatches", () => {
  const lot = makeLot({
    id: "lot-a",
    name: "Лот № 1",
    tags: ["Яркая кислотность"],
    sensory: ["Красная вишня", "Мёд"],
    cupNote: "Сочная ягодная чашка",
  });

  it("считает каждый корень один раз, регистр и «ё» не важны", () => {
    expect(countCharacterMatches(lot, ["вишн", "ягод", "мёд"])).toBe(3);
    expect(countCharacterMatches(lot, ["ВИШНЯ", "МЁД"])).toBe(2);
  });

  it("возвращает 0, когда ничего не совпало или словарь пуст", () => {
    expect(countCharacterMatches(lot, ["шоколад"])).toBe(0);
    expect(countCharacterMatches(lot, [])).toBe(0);
  });

  it("матчит по названию, тегам, сенсорике, чашке, истории фермы и описанию", () => {
    const rich = makeLot({
      id: "lot-rich",
      name: "Эспрессо «Уголь»",
      tags: ["Плотное тело"],
      sensory: ["Какао"],
      cupNote: "Тягучий шоколад",
      farmStory: "Купаж двух ферм",
      description: "Молочный какао-напиток",
    });
    expect(countCharacterMatches(rich, ["уголь"])).toBe(1);
    expect(countCharacterMatches(rich, ["плотн"])).toBe(1);
    expect(countCharacterMatches(rich, ["какао"])).toBe(1);
    expect(countCharacterMatches(rich, ["шоколад"])).toBe(1);
    expect(countCharacterMatches(rich, ["ферм"])).toBe(1);
    expect(countCharacterMatches(rich, ["напиток"])).toBe(1);
  });
});

describe("filterLotsByCharacter", () => {
  const strong = makeLot({
    id: "strong",
    tags: ["Яркая кислотность", "Ягодный профиль"],
    sensory: ["Смородина", "Грейпфрут"],
  });
  const medium = makeLot({ id: "medium", cupNote: "Смородиновая кислотность" });
  const weak = makeLot({ id: "weak", sensory: ["Малина"] });
  const none = makeLot({ id: "none", sensory: ["Какао", "Орех"] });

  it("оставляет только лоты с совпадениями и ранжирует по их числу", () => {
    const result = filterLotsByCharacter([none, weak, strong, medium], ["смородин", "грейпфрут", "ягод", "малин"]);
    expect(result.map((l) => l.id)).toEqual(["strong", "weak", "medium"]);
  });

  it("при равном числе совпадений держит исходный порядок каталога", () => {
    const first = makeLot({ id: "first", sensory: ["Малина"] });
    const second = makeLot({ id: "second", cupNote: "Ягодная чашка" });
    const result = filterLotsByCharacter([first, second], ["малин", "ягод"]);
    expect(result.map((l) => l.id)).toEqual(["first", "second"]);
  });

  it("возвращает пустой список, когда не подходит ничего", () => {
    expect(filterLotsByCharacter([none], ["жасмин"])).toEqual([]);
  });
});

describe("CHARACTER_PREVIEW_LIMIT", () => {
  it("равен 3 — столько лотов показываем по чипсу до «и ещё N»", () => {
    expect(CHARACTER_PREVIEW_LIMIT).toBe(3);
  });
});
