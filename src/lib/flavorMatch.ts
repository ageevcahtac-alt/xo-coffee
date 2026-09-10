import type { FlavorProfile, Lot } from "@/src/types/lot";
import { getWhoLikesIt, isEntryProduct, getEntryProductPitch } from "@/src/lib/lotPresentation";

/**
 * Shared flavor-matching primitives — the canonical vocabulary for "what
 * does this lot taste like" used by Coffee Discovery, the catalog's flavor
 * exploration chips, and Similar Lots. One data model, three surfaces.
 *
 * This is presentation/matching logic only. It reads the site's existing
 * 5-axis FlavorProfile (acidity, sweetness, body, aroma, finish), tags,
 * sensory notes and brew data — it never adds axes, never changes the
 * scale, and never touches Coffee Passport's separate MyCupRating model.
 */

export const FLAVOR_AXES: (keyof FlavorProfile)[] = [
  "acidity",
  "sweetness",
  "body",
  "aroma",
  "finish",
];

export const MAX_PROFILE_DISTANCE = Math.sqrt(FLAVOR_AXES.length * 10 * 10);

export function profileDistance(a: FlavorProfile, b: FlavorProfile): number {
  const sumSquares = FLAVOR_AXES.reduce((sum, axis) => {
    const diff = (a[axis] ?? 5) - (b[axis] ?? 5);
    return sum + diff * diff;
  }, 0);
  return Math.sqrt(sumSquares);
}

/** 0 (opposite) .. 1 (identical), for lots that both have a FlavorProfile. */
export function profileSimilarity(a: FlavorProfile, b: FlavorProfile): number {
  return 1 - profileDistance(a, b) / MAX_PROFILE_DISTANCE;
}

export function averageProfile(lots: Lot[]): FlavorProfile {
  const withProfile = lots.filter((lot) => lot.flavorProfile);
  const count = withProfile.length || 1;
  const sums: FlavorProfile = { acidity: 0, sweetness: 0, body: 0, aroma: 0, finish: 0 };
  for (const lot of withProfile) {
    for (const axis of FLAVOR_AXES) {
      sums[axis] += lot.flavorProfile[axis] ?? 5;
    }
  }
  for (const axis of FLAVOR_AXES) {
    sums[axis] = sums[axis] / count;
  }
  return sums;
}

export function lotSearchText(lot: Lot): string {
  return [...lot.tags, ...lot.sensory, lot.cupNote].join(" ").toLowerCase();
}

// --- Canonical flavor directions --------------------------------------------
//
// Exactly the four directions validated against the real catalog for
// Coffee Discovery's first question. Kept to four on purpose: the example
// list in the flavor-first-catalog brief ("Ягодный", "Яркий/кислотный",
// "Плотный", "Сбалансированный", ...) mostly collapses into these once you
// check the actual lots — e.g. every microlot tagged "Яркая кислотность"
// is also fruity/berry in its sensory notes, and "Сбалансированный" isn't
// a distinguishing direction so much as the absence of an extreme. Adding
// narrower chips than the data actually supports would be a fabricated
// classification, which is exactly what this is meant to avoid.

export type FlavorDirection =
  | "bright-fruity"
  | "sweet-mellow"
  | "floral-tea"
  | "chocolate-dense";

export type FlavorDirectionProfile = {
  target: FlavorProfile;
  keywords: string[];
  reason: string;
  label: string;
};

export const FLAVOR_DIRECTION_PROFILES: Record<FlavorDirection, FlavorDirectionProfile> = {
  "bright-fruity": {
    label: "Яркий и фруктовый",
    target: { acidity: 9, sweetness: 6, body: 5, aroma: 8, finish: 7 },
    keywords: [
      "ягод",
      "вишня",
      "грейпфрут",
      "цитрус",
      "персик",
      "абрикос",
      "фрукт",
      "смородина",
      "инжир",
      "яркая кислотность",
    ],
    reason: "яркий ягодный вкус и заметная, сочная кислотность",
  },
  "sweet-mellow": {
    label: "Сладкий и мягкий",
    target: { acidity: 4, sweetness: 8, body: 6, aroma: 6, finish: 6 },
    keywords: [
      "мёд",
      "карамель",
      "сахар",
      "патока",
      "миндаль",
      "орех",
      "яблоко",
      "сбалансированный",
    ],
    reason: "мягкий, сладкий кофе без резкой кислинки",
  },
  "floral-tea": {
    label: "Цветочный и чайный",
    target: { acidity: 7, sweetness: 6, body: 4, aroma: 9, finish: 7 },
    keywords: ["жасмин", "бергамот", "цветоч", "чайн"],
    reason: "цветочный, чайный характер с лёгким, ароматным телом",
  },
  "chocolate-dense": {
    label: "Шоколадный и плотный",
    target: { acidity: 4, sweetness: 8, body: 9, aroma: 6, finish: 7 },
    keywords: ["какао", "шоколад", "орех", "патока", "карамель", "плотн"],
    reason: "плотный, шоколадный кофе с ощутимой сладостью",
  },
};

export const FLAVOR_DIRECTIONS: FlavorDirection[] = [
  "bright-fruity",
  "sweet-mellow",
  "floral-tea",
  "chocolate-dense",
];

const KEYWORD_BONUS_STEP = 0.08;
const KEYWORD_BONUS_CAP = 0.4;

/**
 * How well a lot matches one flavor direction: closeness of its numeric
 * FlavorProfile to the direction's target point, plus a bonus for real
 * tag/sensory/cupNote text matching that direction's keywords. Range is
 * roughly 0..1.4 (closeness maxes at 1, keyword bonus caps at 0.4).
 */
export function getFlavorDirectionScore(lot: Lot, direction: FlavorDirection): number {
  const profile = lot.flavorProfile;
  const { target, keywords } = FLAVOR_DIRECTION_PROFILES[direction];

  let closeness = 0.5;
  if (profile) {
    const totalDiff = FLAVOR_AXES.reduce((sum, axis) => {
      const lotValue = profile[axis] ?? 5;
      return sum + Math.abs(target[axis] - lotValue);
    }, 0);
    closeness = 1 - totalDiff / (FLAVOR_AXES.length * 10);
  }

  const text = lotSearchText(lot);
  const matchedKeywords = keywords.filter((keyword) => text.includes(keyword));
  const keywordBonus = Math.min(KEYWORD_BONUS_CAP, matchedKeywords.length * KEYWORD_BONUS_STEP);

  return closeness + keywordBonus;
}

const BEST_DIRECTION_THRESHOLD = 0.85;

/** The single flavor direction a lot fits best, or null if none fit clearly. */
export function getBestFlavorDirection(lot: Lot): FlavorDirection | null {
  let best: FlavorDirection | null = null;
  let bestScore = -Infinity;
  for (const direction of FLAVOR_DIRECTIONS) {
    const score = getFlavorDirectionScore(lot, direction);
    if (score > bestScore) {
      bestScore = score;
      best = direction;
    }
  }
  return bestScore >= BEST_DIRECTION_THRESHOLD ? best : null;
}

// --- Tasting-history adjustment ---------------------------------------------

export type FlavorHistory = {
  likedLotIds?: string[];
  dislikedLotIds?: string[];
};

/** -1 (disliked), 0 (no signal) or 1 (liked) — a soft nudge, never a hide. */
export function historyAdjustment(lot: Lot, history: FlavorHistory | undefined): number {
  if (!history) return 0;
  if (history.dislikedLotIds?.includes(lot.id)) return -1;
  if (history.likedLotIds?.includes(lot.id)) return 1;
  return 0;
}

// --- Catalog flavor-direction ranking ---------------------------------------

const DIRECTION_HISTORY_WEIGHT = 0.15;

/**
 * Reorders (never hides) `lots` by affinity to one flavor direction, with a
 * small tasting-history nudge. Ties keep the lots' original order — same
 * inputs always produce the same output.
 */
export function rankLotsByFlavorDirection(
  lots: Lot[],
  direction: FlavorDirection,
  history?: FlavorHistory,
): Lot[] {
  return lots
    .map((lot, index) => ({
      lot,
      index,
      score:
        getFlavorDirectionScore(lot, direction) +
        historyAdjustment(lot, history) * DIRECTION_HISTORY_WEIGHT,
    }))
    .sort((a, b) => (b.score !== a.score ? b.score - a.score : a.index - b.index))
    .map(({ lot }) => lot);
}

// --- Similar lots ------------------------------------------------------------

export type SimilarLotResult = {
  lot: Lot;
  reason: string;
};

// Tags that describe how the coffee actually tastes, as opposed to
// commercial/logistics tags ("Эксклюзив", "Сезонный", "Подарочный",
// "Дегустационный сет") that are true of the lot but don't say anything
// about flavor — sharing one of those isn't an honest similarity signal.
const DESCRIPTIVE_TAGS = new Set([
  "Яркая кислотность",
  "Ягодный профиль",
  "Шоколадные тона",
  "Сбалансированный профиль",
  "Плотное тело",
]);

function overlapScore(a: Lot, b: Lot): number {
  const aTags = a.tags.filter((tag) => DESCRIPTIVE_TAGS.has(tag));
  const bTags = b.tags.filter((tag) => DESCRIPTIVE_TAGS.has(tag));
  const tagOverlap = aTags.filter((tag) => bTags.includes(tag)).length;
  const tagUnion = new Set([...aTags, ...bTags]).size || 1;
  const sensoryOverlap = a.sensory.filter((note) => b.sensory.includes(note)).length;
  const sensoryUnion = new Set([...a.sensory, ...b.sensory]).size || 1;
  return (tagOverlap / tagUnion) * 0.5 + (sensoryOverlap / sensoryUnion) * 0.5;
}

const POUR_OVER_CATEGORIES = new Set(["filter", "microlot"]);

function brewCompatibility(a: Lot, b: Lot): number {
  if (a.category === b.category) return 1;
  if (POUR_OVER_CATEGORIES.has(a.category) && POUR_OVER_CATEGORIES.has(b.category)) return 0.8;
  return 0.4;
}

const SIMILARITY_WEIGHTS = {
  flavor: 0.55,
  overlap: 0.25,
  brew: 0.15,
  history: 0.15,
};

/** Grounded in real shared descriptors — never invents a tasting note. */
function getSimilarityReason(base: Lot, candidate: Lot): string {
  if (isEntryProduct(candidate)) return getEntryProductPitch();

  const candidateDirection = getBestFlavorDirection(candidate);
  const baseDirection = getBestFlavorDirection(base);
  if (candidateDirection && candidateDirection === baseDirection) {
    return `Похож по вкусу: ${FLAVOR_DIRECTION_PROFILES[candidateDirection].reason}.`;
  }

  const sharedSensory = base.sensory.filter((note) => candidate.sensory.includes(note));
  if (sharedSensory.length > 0) {
    return `Похожие ноты в чашке: ${sharedSensory.slice(0, 2).join(", ")}.`;
  }

  const sharedDescriptiveTags = base.tags.filter(
    (tag) => DESCRIPTIVE_TAGS.has(tag) && candidate.tags.includes(tag),
  );
  if (sharedDescriptiveTags.length > 0) {
    return `Похожий характер: ${sharedDescriptiveTags[0].toLowerCase()}.`;
  }

  return getWhoLikesIt(
    candidate,
    candidateDirection ? FLAVOR_DIRECTION_PROFILES[candidateDirection].reason : null,
  );
}

const DIVERSITY_PENALTY_WEIGHT = 0.35;

/**
 * Up to `limit` lots similar to `lot`, ranked mainly by FlavorProfile
 * closeness plus real tag/sensory overlap, brew compatibility, and a small
 * tasting-history nudge (soft — a disliked lot can still appear if it's
 * genuinely close, just ranked a little lower). Never recommends `lot`
 * itself. A lightweight diversity pass (borrowed from maximal-marginal-
 * relevance) discourages the top picks from being near-duplicates of each
 * other when the catalog has more variety to offer. Deterministic: same
 * lots + history always produce the same order.
 */
export function getSimilarLots(
  lot: Lot,
  allLots: Lot[],
  limit = 3,
  history?: FlavorHistory,
): SimilarLotResult[] {
  const candidates = allLots.filter((candidate) => candidate.id !== lot.id);
  if (candidates.length === 0) return [];

  const scored = candidates.map((candidate, index) => {
    const flavor =
      lot.flavorProfile && candidate.flavorProfile
        ? profileSimilarity(lot.flavorProfile, candidate.flavorProfile)
        : 0.5;
    const overlap = overlapScore(lot, candidate);
    const brew = brewCompatibility(lot, candidate);
    const historyBonus = historyAdjustment(candidate, history);
    const score =
      flavor * SIMILARITY_WEIGHTS.flavor +
      overlap * SIMILARITY_WEIGHTS.overlap +
      brew * SIMILARITY_WEIGHTS.brew +
      historyBonus * SIMILARITY_WEIGHTS.history;
    return { candidate, index, flavor, score };
  });

  const remaining = [...scored].sort((a, b) =>
    b.score !== a.score ? b.score - a.score : a.index - b.index,
  );
  const picked: typeof scored = [];

  while (picked.length < limit && remaining.length > 0) {
    // Greedy diversity: penalize a candidate for how close it is (in
    // flavor) to picks already made, so the top results aren't all the
    // same near-duplicate lot when the catalog has real variety.
    let bestPos = 0;
    let bestAdjusted = -Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const entry = remaining[i];
      const maxSimilarityToPicked = picked.reduce(
        (max, p) => Math.max(max, 1 - Math.abs(p.flavor - entry.flavor)),
        0,
      );
      const adjusted = entry.score - maxSimilarityToPicked * DIVERSITY_PENALTY_WEIGHT * (picked.length > 0 ? 1 : 0);
      if (
        adjusted > bestAdjusted ||
        (adjusted === bestAdjusted && entry.index < remaining[bestPos].index)
      ) {
        bestAdjusted = adjusted;
        bestPos = i;
      }
    }
    picked.push(remaining[bestPos]);
    remaining.splice(bestPos, 1);
  }

  return picked.map(({ candidate }) => ({
    lot: candidate,
    reason: getSimilarityReason(lot, candidate),
  }));
}
