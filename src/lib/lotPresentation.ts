import type { BrewSpec, Lot } from "@/src/types/lot";

/**
 * Presentation-layer helpers for the catalog's "Simple layer".
 *
 * These derive human-readable summaries from data that already exists on a
 * Lot (flavorProfile, category, brew) instead of inventing new facts about
 * the coffee. Nothing here should be treated as a second source of truth —
 * if a Lot is missing a field, the corresponding summary degrades quietly.
 */

const ENTRY_PRODUCT_CATEGORY = "specialty-set";

export function isEntryProduct(lot: Lot): boolean {
  return lot.category === ENTRY_PRODUCT_CATEGORY;
}

export function getEntryProductPitch(): string {
  return "Не нужно сразу выбирать один лот — начните с трёх разных характеров в одной коробке.";
}

/**
 * One plain-language sentence answering "кому понравится". When the caller
 * already has a confident flavor-direction reason for this lot (from
 * src/lib/flavorMatch.ts's getBestFlavorDirection/FLAVOR_DIRECTION_PROFILES
 * — passed in rather than computed here to avoid a circular import, same
 * reasoning as getWhyTry above), that reason is used directly so this
 * sentence can never contradict a direction label shown next to it. Without
 * one, this falls back to the lot's numeric flavor profile with
 * intentionally coarse buckets — a simple-layer hint, not a substitute for
 * the full profile in the Passport.
 */
export function getWhoLikesIt(lot: Lot, characterReason?: string | null): string {
  if (isEntryProduct(lot)) return getEntryProductPitch();

  if (characterReason) {
    return `Если любите ${characterReason}.`;
  }

  const profile = lot.flavorProfile;
  if (!profile) {
    return "Хорошо сбалансированный кофе на каждый день.";
  }

  const { acidity = 0, sweetness = 0, body = 0 } = profile;

  if (acidity >= 8 && (profile.aroma ?? 0) >= 8) {
    return "Если любите яркий, ароматный кофе с выраженной кислотностью и цветочно-фруктовым характером.";
  }
  if (acidity >= 8) {
    return "Если любите сочный, живой кофе с заметной кислотностью и ягодным характером.";
  }
  if (body >= 8) {
    return "Если любите плотный, тягучий кофе с шоколадной сладостью — хорошая база для эспрессо и молочных напитков.";
  }
  if (sweetness >= 7 && acidity <= 6) {
    return "Если любите мягкий, сладкий кофе без резкой кислинки.";
  }
  return "Если любите сбалансированный кофе, где кислотность, сладость и тело уравновешены.";
}

type BrewMethod = keyof NonNullable<Lot["brew"]>;

const BREW_METHOD_LABELS: Record<BrewMethod, string> = {
  v60: "V60",
  immersion: "Иммерсия",
  espresso: "Эспрессо",
};

export type BrewHighlight = {
  method: BrewMethod;
  label: string;
  spec: BrewSpec;
  note?: string;
};

/**
 * Picks the one brew method worth headlining on the simple layer. The full
 * set of recipes stays available in the Passport.
 */
export function getBrewHighlight(lot: Lot): BrewHighlight | null {
  // Narrowed into a local: TS forgets `lot.brew`'s non-undefined narrowing
  // across the isEntryProduct(lot) call below, since it can't prove a
  // property access wasn't mutated by an intervening function call.
  const brew = lot.brew;
  if (!brew) return null;

  if (isEntryProduct(lot) && brew.v60) {
    return {
      method: "v60",
      label: BREW_METHOD_LABELS.v60,
      spec: brew.v60,
      note: "Один рецепт на все три лота — удобно сравнивать",
    };
  }

  const preferredMethod: BrewMethod = lot.category === "espresso" ? "espresso" : "v60";

  const spec = brew[preferredMethod] ?? brew.v60 ?? brew.espresso ?? brew.immersion;
  if (!spec) return null;

  const method = brew[preferredMethod]
    ? preferredMethod
    : (Object.keys(brew) as BrewMethod[]).find((key) => brew[key] === spec) ?? preferredMethod;

  return {
    method,
    label: BREW_METHOD_LABELS[method] ?? method,
    spec,
  };
}

// --- Product Experience helpers ---------------------------------------------
//
// The "Product" level (catalog card + the top of the Lot Passport modal)
// needs a few more compact, honest summaries than the Simple Layer above
// originally covered. Same rule as everything else in this file: derive
// from fields the lot already has, degrade quietly when a field is missing,
// never invent a fact about a specific lot.

export type LotFactChip = { label: string; value: string };

/**
 * A short, scannable strip of what actually makes this lot identifiable —
 * variety, process, altitude, Q-grade — pulled straight from the lot's own
 * fields. This is deliberately NOT the full spec table (the Passport further
 * down already has that in detail); it only includes a fact if the field is
 * present, so a lot with partial data still renders a sane, shorter strip
 * instead of blank/undefined entries.
 */
export function getLotFactChips(lot: Lot): LotFactChip[] {
  const chips: LotFactChip[] = [];
  if (isNonEmptyValue(lot.variety)) chips.push({ label: "Сорт", value: lot.variety });
  if (isNonEmptyValue(lot.process)) chips.push({ label: "Обработка", value: lot.process });
  if (typeof lot.altitudeMasl === "number" && Number.isFinite(lot.altitudeMasl)) {
    chips.push({ label: "Высота", value: `${lot.altitudeMasl} MASL` });
  }
  if (typeof lot.qScore === "number" && Number.isFinite(lot.qScore)) {
    chips.push({ label: "Q-грейд", value: `${lot.qScore}` });
  }
  return chips;
}

function isNonEmptyValue(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * "Почему попробовать" — one honest sentence connecting Pure Roast (a
 * roasting method, not a second brand — kept to a single short clause, no
 * manifesto) to this specific lot. `characterReason` is the flavor-
 * direction phrasing from src/lib/flavorMatch.ts's FLAVOR_DIRECTION_PROFILES
 * — passed in by the caller rather than imported here, since flavorMatch.ts
 * already imports from this module and a reverse import would create a
 * cycle. Never claims "unique"/"best"/"rarest" — only what the data (or the
 * lack of a confident direction) actually supports.
 */
export function getWhyTry(lot: Lot, characterReason: string | null): string {
  if (isEntryProduct(lot)) {
    return "Один заказ — сразу три обжарки, каждая доведена до своей точки раскрытия. Так проще понять, какой характер кофе ваш.";
  }
  if (characterReason) {
    return `Pure Roast для этого лота: обжарка, подобранная так, чтобы раскрыть ${characterReason}.`;
  }
  return "Pure Roast для этого лота: обжарка, подобранная под характер именно этого зерна — подробности в паспорте ниже.";
}
