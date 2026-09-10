import type { Lot } from "@/src/types/lot";
import type { BrewMethodKey, TastingRecord } from "@/src/types/coffeePassport";
import {
  LIKED_OVERALL_THRESHOLD,
  DISLIKED_OVERALL_THRESHOLD,
} from "@/src/lib/coffeePassport";
import {
  FLAVOR_DIRECTION_PROFILES,
  getBestFlavorDirection,
  type FlavorDirection,
} from "@/src/lib/flavorMatch";
import { isEntryProduct } from "@/src/lib/lotPresentation";
import {
  getDiscoveryRecommendations,
  type DiscoveryResult,
} from "@/src/lib/discovery";

/**
 * Personal Taste Layer — turns raw local Coffee Passport tasting records
 * into a normalized "what does this person seem to like" context, and a
 * thin recommendation step on top of the existing Discovery engine.
 *
 * Pure functions only: everything here takes tasting records as a plain
 * array and returns plain data. Nothing in this file reads localStorage —
 * that stays the caller's job (see src/lib/coffeePassport.ts). That seam is
 * deliberate: a future account/backend only has to swap where the array of
 * TastingRecords comes from, not how it's interpreted or used to rank
 * lots. This module never touches FlavorProfile (the professional 0-10,
 * 5-axis lot profile) — it only reads MyCupRating (the personal 1-5
 * impression) and lot identity, and it never rewrites either.
 */

export type TasteConfidence = "none" | "low" | "some" | "good";

export type PersonalTasteContext = {
  tastingCount: number;
  distinctLotsCount: number;
  confidence: TasteConfidence;
  /** Every distinct lot with at least one tasting, regardless of rating —
   *  used to avoid re-suggesting something already tried. */
  tastedLotIds: string[];
  likedLotIds: string[];
  dislikedLotIds: string[];
  /** Ranked by how often a liked, non-set lot best fits that direction.
   *  Empty if there isn't enough signal, or if likes are entry-product-only. */
  preferredDirections: FlavorDirection[];
  /** Ranked by how often each brew method was actually used — a plain
   *  usage fact, not a judgment, so it's shown starting from 1 tasting. */
  preferredBrewMethods: BrewMethodKey[];
  recentTastings: TastingRecord[];
};

const LOW_CONFIDENCE_MAX = 1;
const SOME_CONFIDENCE_MAX = 3;
const RECENT_TASTINGS_LIMIT = 5;

export function getTasteConfidence(tastingCount: number): TasteConfidence {
  if (tastingCount <= 0) return "none";
  if (tastingCount <= LOW_CONFIDENCE_MAX) return "low";
  if (tastingCount <= SOME_CONFIDENCE_MAX) return "some";
  return "good";
}

function rankByFrequency<T>(values: T[]): T[] {
  const counts = new Map<T, number>();
  const firstSeen = new Map<T, number>();
  values.forEach((value, index) => {
    counts.set(value, (counts.get(value) ?? 0) + 1);
    if (!firstSeen.has(value)) firstSeen.set(value, index);
  });
  return [...counts.keys()].sort((a, b) => {
    const diff = (counts.get(b) ?? 0) - (counts.get(a) ?? 0);
    if (diff !== 0) return diff;
    return (firstSeen.get(a) ?? 0) - (firstSeen.get(b) ?? 0); // deterministic tie-break
  });
}

/**
 * Normalizes raw tasting records (newest-first, as coffeePassport.ts
 * already returns them) into a personal taste context. Never throws on
 * malformed input — records are assumed already schema-validated by
 * coffeePassport.ts, but a lot that's since been removed from the catalog
 * is simply skipped for direction/brew tallying (its rating still counts
 * toward liked/disliked and the totals).
 */
export function buildPersonalTasteContext(
  lots: Lot[],
  tastings: TastingRecord[],
): PersonalTasteContext {
  const distinctLotIds = new Set(tastings.map((t) => t.lotId));
  const liked = new Set<string>();
  const disliked = new Set<string>();
  const likedDirections: FlavorDirection[] = [];
  const brewMethods: BrewMethodKey[] = [];

  for (const tasting of tastings) {
    if (tasting.rating.overall >= LIKED_OVERALL_THRESHOLD) liked.add(tasting.lotId);
    if (tasting.rating.overall <= DISLIKED_OVERALL_THRESHOLD) disliked.add(tasting.lotId);
    brewMethods.push(tasting.brewMethod);

    if (tasting.rating.overall < LIKED_OVERALL_THRESHOLD) continue;
    const lot = lots.find((candidate) => candidate.id === tasting.lotId);
    // A multi-origin tasting set can't honestly attribute a single flavor
    // direction to "what you liked" — its one FlavorProfile covers three
    // different characters, so it's excluded from this tally rather than
    // guessed at.
    if (!lot || isEntryProduct(lot)) continue;
    const direction = getBestFlavorDirection(lot);
    if (direction) likedDirections.push(direction);
  }

  return {
    tastingCount: tastings.length,
    distinctLotsCount: distinctLotIds.size,
    confidence: getTasteConfidence(tastings.length),
    tastedLotIds: [...distinctLotIds],
    likedLotIds: [...liked],
    dislikedLotIds: [...disliked],
    preferredDirections: rankByFrequency(likedDirections),
    preferredBrewMethods: rankByFrequency(brewMethods),
    recentTastings: tastings.slice(0, RECENT_TASTINGS_LIMIT),
  };
}

const DIRECTION_TO_BREW_ANSWER: Record<FlavorDirection, "filter" | "espresso"> = {
  "bright-fruity": "filter",
  "sweet-mellow": "filter",
  "floral-tea": "filter",
  "chocolate-dense": "espresso",
};

function brewMethodToDiscoveryAnswer(
  method: BrewMethodKey | undefined,
): "espresso" | "filter" | "aeropress" | "batch" | "other" {
  if (method === "v60") return "filter";
  if (method === "immersion") return "batch";
  if (method === "espresso") return "espresso";
  return "other";
}

/**
 * "Попробовать дальше" — a thin wrapper around the existing Discovery
 * engine, not a second recommender. With a confident, clear flavor
 * preference it asks Discovery for that direction with novelty "new" (the
 * mode already built to favor a lot that shares the direction but isn't
 * the single most obvious pick — exactly the "similar, but a little new"
 * signal this needs, reused rather than reimplemented). Already-tasted
 * lots are filtered out where the catalog is large enough to afford it,
 * but never down to an empty list. Without a clear preference, it falls
 * back to Discovery's own "unknown taste" path, which already surfaces
 * specialty-degustation when appropriate — so a taster with no signal
 * yet still gets a sensible, honest suggestion instead of nothing.
 */
export function getPersonalRecommendations(
  lots: Lot[],
  context: PersonalTasteContext,
  limit = 3,
): DiscoveryResult[] {
  if (lots.length === 0) return [];

  const history = {
    likedLotIds: context.likedLotIds,
    dislikedLotIds: context.dislikedLotIds,
  };

  const topDirection = context.preferredDirections[0];
  const hasClearPreference =
    (context.confidence === "some" || context.confidence === "good") && Boolean(topDirection);

  let answers: Parameters<typeof getDiscoveryRecommendations>[1];
  if (hasClearPreference && topDirection) {
    const brewFromHabit = brewMethodToDiscoveryAnswer(context.preferredBrewMethods[0]);
    const brew = brewFromHabit === "other" ? DIRECTION_TO_BREW_ANSWER[topDirection] : brewFromHabit;
    answers = { taste: topDirection, brew, novelty: "new" };
  } else {
    answers = { taste: "unknown", brew: "other", novelty: "unusual" };
  }

  const tastedLotIds = new Set(context.tastedLotIds);
  const widerLimit = Math.min(lots.length, limit + tastedLotIds.size);
  const wideResults = getDiscoveryRecommendations(lots, answers, widerLimit, history);

  const notYetTasted = wideResults.filter((result) => !tastedLotIds.has(result.lot.id));
  const finalResults = notYetTasted.length > 0 ? notYetTasted : wideResults;

  return finalResults.slice(0, limit);
}

// --- Human-language taste summary -------------------------------------------

/**
 * "Что мне нравится" — one honest sentence, hedged to match how much
 * signal actually exists. Never claims more certainty than the tasting
 * count supports, and never diagnoses a "type" — it describes a leaning,
 * grounded in the same direction phrasing already used elsewhere
 * (Discovery, Similar Lots), not a separately invented vocabulary.
 */
export function getTasteSummary(context: PersonalTasteContext): string {
  if (context.confidence === "none") {
    return "Попробуйте первый кофе — и мы начнём понимать ваш вкус.";
  }
  if (context.confidence === "low") {
    return "Первое впечатление сохранено. Пока рано делать выводы — попробуйте ещё один лот, чтобы мы начали замечать тенденцию.";
  }

  const topDirection = context.preferredDirections[0];
  if (!topDirection) {
    return context.confidence === "some"
      ? "Пока ваши впечатления разные — интересно посмотреть, что раскроется дальше."
      : "Ваши вкусы разнообразны: нет одного явного направления, и это тоже интересный профиль.";
  }

  const phrase = FLAVOR_DIRECTION_PROFILES[topDirection].reason;
  return context.confidence === "some"
    ? `Похоже, вам нравится ${phrase}.`
    : `Вам чаще нравится ${phrase}.`;
}

const BREW_METHOD_LABELS: Record<BrewMethodKey, string> = {
  v60: "V60",
  immersion: "иммерсию",
  espresso: "эспрессо",
  other: "свой способ",
};

/** A plain usage fact ("you've brewed via X"), not a preference claim —
 *  safe to show from the very first tasting. Null with no tastings at all. */
export function getBrewHabitSummary(context: PersonalTasteContext): string | null {
  const topMethod = context.preferredBrewMethods[0];
  if (!topMethod) return null;
  return `Чаще всего вы завариваете через ${BREW_METHOD_LABELS[topMethod]}.`;
}
