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
 * One plain-language sentence answering "кому понравится", derived from the
 * lot's numeric flavor profile. Buckets are intentionally coarse — this is a
 * simple-layer hint, not a substitute for the full profile in the Passport.
 */
export function getWhoLikesIt(lot: Lot): string {
  if (isEntryProduct(lot)) return getEntryProductPitch();

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

const BREW_METHOD_LABELS: Record<keyof Lot["brew"], string> = {
  v60: "V60",
  immersion: "Иммерсия",
  espresso: "Эспрессо",
};

export type BrewHighlight = {
  method: keyof Lot["brew"];
  label: string;
  spec: BrewSpec;
  note?: string;
};

/**
 * Picks the one brew method worth headlining on the simple layer. The full
 * set of recipes stays available in the Passport.
 */
export function getBrewHighlight(lot: Lot): BrewHighlight | null {
  if (!lot.brew) return null;

  if (isEntryProduct(lot) && lot.brew.v60) {
    return {
      method: "v60",
      label: BREW_METHOD_LABELS.v60,
      spec: lot.brew.v60,
      note: "Один рецепт на все три лота — удобно сравнивать",
    };
  }

  const preferredMethod: keyof Lot["brew"] =
    lot.category === "espresso" ? "espresso" : "v60";

  const spec = lot.brew[preferredMethod] ?? lot.brew.v60 ?? lot.brew.espresso ?? lot.brew.immersion;
  if (!spec) return null;

  const method = lot.brew[preferredMethod]
    ? preferredMethod
    : (Object.keys(lot.brew) as (keyof Lot["brew"])[]).find((key) => lot.brew[key] === spec) ??
      preferredMethod;

  return {
    method,
    label: BREW_METHOD_LABELS[method] ?? method,
    spec,
  };
}
