import type { Lot } from "@/src/types/lot";
import { getWhoLikesIt, isEntryProduct } from "@/src/lib/lotPresentation";
import {
  FLAVOR_DIRECTIONS,
  FLAVOR_DIRECTION_PROFILES,
  averageProfile,
  getBestFlavorDirection,
  getFlavorDirectionScore,
  historyAdjustment,
  profileDistance,
  MAX_PROFILE_DISTANCE,
  type FlavorDirection,
} from "@/src/lib/flavorMatch";

/**
 * Coffee Discovery matching engine.
 *
 * A pure, deterministic function of (lots, answers) — no randomness, no
 * network calls, no account state of its own. It reuses the site's existing
 * 5-axis FlavorProfile, tags, sensory notes and brew data via
 * src/lib/flavorMatch.ts (the same primitives back the catalog's flavor
 * chips and Similar Lots) — it does not introduce a second taxonomy or
 * touch the FlavorProfile shape.
 *
 * Kept as plain functions (not a class/hook) so a future step — feeding in
 * Coffee Passport tasting history or past purchases — can wrap or extend
 * this module without changing how it scores a single lot today.
 */

export type TasteAnswer = FlavorDirection | "unknown";

export type BrewAnswer = "espresso" | "filter" | "aeropress" | "batch" | "other";

export type NoveltyAnswer = "familiar" | "new" | "unusual";

export type DiscoveryAnswers = {
  taste: TasteAnswer;
  brew: BrewAnswer;
  novelty: NoveltyAnswer;
};

export type DiscoveryResult = {
  lot: Lot;
  reason: string;
  isEntryFallback: boolean;
};

/**
 * Optional signal from Coffee Passport tasting history (see
 * src/lib/coffeePassport.ts's getLikedDislikedLotIds). Omitting it, or
 * passing empty arrays — always true before anyone has tasted anything —
 * leaves ranking identical to having no history at all.
 */
export type DiscoveryHistory = {
  likedLotIds?: string[];
  dislikedLotIds?: string[];
};

export const TASTE_OPTIONS: { value: TasteAnswer; label: string }[] = [
  ...FLAVOR_DIRECTIONS.map((direction) => ({
    value: direction as TasteAnswer,
    label: FLAVOR_DIRECTION_PROFILES[direction].label,
  })),
  { value: "unknown", label: "Не знаю" },
];

export const BREW_OPTIONS: { value: BrewAnswer; label: string }[] = [
  { value: "espresso", label: "Эспрессо" },
  { value: "filter", label: "Фильтр" },
  { value: "aeropress", label: "Аэропресс" },
  { value: "batch", label: "Батч" },
  { value: "other", label: "Другой" },
];

export const NOVELTY_OPTIONS: { value: NoveltyAnswer; label: string }[] = [
  { value: "familiar", label: "Знакомый профиль" },
  { value: "new", label: "Что-то новое" },
  { value: "unusual", label: "Самый необычный лот" },
];

// --- Taste matching -------------------------------------------------------

const UNKNOWN_TASTE_SCORE = 0.5;

function tasteScore(lot: Lot, taste: TasteAnswer): number {
  if (taste === "unknown") return UNKNOWN_TASTE_SCORE;
  return getFlavorDirectionScore(lot, taste);
}

// --- Brew matching ----------------------------------------------------------

const BREW_WEIGHT_EXACT = 1;
const BREW_WEIGHT_COMPATIBLE = 0.6;
const BREW_WEIGHT_NEUTRAL = 0.35;

function brewScore(lot: Lot, brew: BrewAnswer): number {
  if (brew === "other") return BREW_WEIGHT_NEUTRAL;

  const brewData = lot.brew;
  if (!brewData) return BREW_WEIGHT_NEUTRAL;

  if (brew === "espresso") {
    if (!brewData.espresso) return BREW_WEIGHT_NEUTRAL;
    return lot.category === "espresso" ? BREW_WEIGHT_EXACT : BREW_WEIGHT_COMPATIBLE;
  }

  if (brew === "filter") {
    if (!brewData.v60) return BREW_WEIGHT_NEUTRAL;
    return lot.category === "filter" || lot.category === "microlot"
      ? BREW_WEIGHT_EXACT
      : BREW_WEIGHT_COMPATIBLE;
  }

  // Aeropress and batch brewing aren't tracked as their own recipe in the
  // data — both are immersion-style methods, so the existing "immersion"
  // recipe is the closest real signal we have. No lot can score "exact"
  // here since there is no aeropress/batch field to match against.
  if (brew === "aeropress" || brew === "batch") {
    return brewData.immersion ? BREW_WEIGHT_COMPATIBLE : BREW_WEIGHT_NEUTRAL;
  }

  return BREW_WEIGHT_NEUTRAL;
}

// --- Novelty adjustment -----------------------------------------------------

const NEW_RELEVANCE_FLOOR = 0.45;
const UNUSUAL_ENTRY_SET_BONUS = 0.15;

function noveltyBonus(
  lot: Lot,
  taste: number,
  novelty: NoveltyAnswer,
  topPick: Lot,
  corpusAverage: ReturnType<typeof averageProfile>,
): number {
  if (novelty === "familiar") return 0;

  const profile = lot.flavorProfile;
  if (!profile) return 0;

  if (novelty === "new") {
    if (taste < NEW_RELEVANCE_FLOOR) return 0;
    if (lot.id === topPick.id) return 0;
    // No profile on the top pick means there's no honest distance to
    // measure "new" against — same "no signal, no bonus" rule as above.
    const topProfile = topPick.flavorProfile;
    if (!topProfile) return 0;
    return profileDistance(profile, topProfile) / MAX_PROFILE_DISTANCE;
  }

  // "unusual": how far this lot sits from the catalog's average profile,
  // plus a modest bump for lots that are structurally different (a
  // multi-origin set instead of a single lot) — both derived from real
  // data already on the lot, not an invented rarity score.
  let bonus = profileDistance(profile, corpusAverage) / MAX_PROFILE_DISTANCE;
  if (isEntryProduct(lot)) bonus += UNUSUAL_ENTRY_SET_BONUS;
  return bonus;
}

// --- Composite scoring -------------------------------------------------------

const TASTE_WEIGHT = 0.6;
const BREW_WEIGHT = 0.25;
const NOVELTY_WEIGHT = 0.15;
const HISTORY_WEIGHT = 0.2;
const LOW_CONFIDENCE_SPREAD_THRESHOLD = 0.12;

function getDiscoveryReason(
  lot: Lot,
  answers: DiscoveryAnswers,
  isFallback: boolean,
): string {
  if (isFallback) {
    return "Если пока не знаете, какой характер кофе ваш — начните с дегустации.";
  }
  if (answers.taste === "unknown") {
    const lotDirection = isEntryProduct(lot) ? null : getBestFlavorDirection(lot);
    return getWhoLikesIt(
      lot,
      lotDirection ? FLAVOR_DIRECTION_PROFILES[lotDirection].reason : null,
    );
  }

  const { reason: direction } = FLAVOR_DIRECTION_PROFILES[answers.taste];
  const notes = lot.sensory.slice(0, 2);
  if (notes.length > 0) {
    return `Подойдёт, если вам нравится ${direction}. В чашке это раскрывается нотами: ${notes.join(", ")}.`;
  }
  return `Подойдёт, если вам нравится ${direction}.`;
}

/**
 * Ranks the catalog for a Discovery answer set and returns up to `limit`
 * recommendations. Never throws and never returns more than `lots.length`
 * items — with 0 lots it returns an empty array, with 1–2 lots it returns
 * all of them ranked, and ties keep the lots' original catalog order.
 */
export function getDiscoveryRecommendations(
  lots: Lot[],
  answers: DiscoveryAnswers,
  limit = 3,
  history?: DiscoveryHistory,
): DiscoveryResult[] {
  if (lots.length === 0) return [];

  const tasteScores = lots.map((lot) => tasteScore(lot, answers.taste));
  const maxTaste = Math.max(...tasteScores);
  const minTaste = Math.min(...tasteScores);
  const topPickIndex = tasteScores.indexOf(maxTaste);
  const topPick = lots[topPickIndex];
  const corpusAverage = averageProfile(lots);

  const scored = lots.map((lot, index) => {
    const taste = tasteScores[index];
    const brew = brewScore(lot, answers.brew);
    const novelty = noveltyBonus(lot, taste, answers.novelty, topPick, corpusAverage);
    const composite =
      taste * TASTE_WEIGHT +
      brew * BREW_WEIGHT +
      novelty * NOVELTY_WEIGHT +
      historyAdjustment(lot, history) * HISTORY_WEIGHT;
    return { lot, index, composite };
  });

  const stableSorted = [...scored].sort((a, b) => {
    if (b.composite !== a.composite) return b.composite - a.composite;
    return a.index - b.index; // stable, deterministic tie-break: catalog order
  });

  let top = stableSorted.slice(0, limit);

  const spread = maxTaste - minTaste;
  const lowConfidence = answers.taste === "unknown" || spread < LOW_CONFIDENCE_SPREAD_THRESHOLD;
  const entryLot = lots.find((lot) => isEntryProduct(lot));

  if (lowConfidence && entryLot && !top.some((entry) => entry.lot.id === entryLot.id)) {
    const entryEntry = stableSorted.find((entry) => entry.lot.id === entryLot.id);
    if (entryEntry) {
      top = [...top.slice(0, Math.max(0, limit - 1)), entryEntry].sort((a, b) => {
        if (b.composite !== a.composite) return b.composite - a.composite;
        return a.index - b.index;
      });
    }
  }

  return top.map(({ lot }) => ({
    lot,
    reason: getDiscoveryReason(lot, answers, lowConfidence && lot.id === entryLot?.id),
    isEntryFallback: lowConfidence && lot.id === entryLot?.id,
  }));
}
