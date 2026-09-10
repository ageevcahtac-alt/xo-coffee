import type { FlavorProfile, Lot } from "@/src/types/lot";
import { getWhoLikesIt, isEntryProduct } from "@/src/lib/lotPresentation";

/**
 * Coffee Discovery matching engine.
 *
 * A pure, deterministic function of (lots, answers) — no randomness, no
 * network calls, no account/history state. It reuses the site's existing
 * 5-axis FlavorProfile, tags, sensory notes and brew data; it does not
 * introduce a second taxonomy or touch the FlavorProfile shape.
 *
 * Kept as plain functions (not a class/hook) so a future step — feeding in
 * Coffee Passport tasting history or past purchases — can wrap or extend
 * this module without changing how it scores a single lot today.
 */

export type TasteAnswer =
  | "bright-fruity"
  | "sweet-mellow"
  | "floral-tea"
  | "chocolate-dense"
  | "unknown";

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
  { value: "bright-fruity", label: "Яркий и фруктовый" },
  { value: "sweet-mellow", label: "Сладкий и мягкий" },
  { value: "floral-tea", label: "Цветочный и чайный" },
  { value: "chocolate-dense", label: "Шоколадный и плотный" },
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

type TasteProfile = {
  target: FlavorProfile;
  keywords: string[];
  reason: string;
};

const TASTE_PROFILES: Record<Exclude<TasteAnswer, "unknown">, TasteProfile> = {
  "bright-fruity": {
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
    target: { acidity: 7, sweetness: 6, body: 4, aroma: 9, finish: 7 },
    keywords: ["жасмин", "бергамот", "цветоч", "чайн"],
    reason: "цветочный, чайный характер с лёгким, ароматным телом",
  },
  "chocolate-dense": {
    target: { acidity: 4, sweetness: 8, body: 9, aroma: 6, finish: 7 },
    keywords: ["какао", "шоколад", "орех", "патока", "карамель", "плотн"],
    reason: "плотный, шоколадный кофе с ощутимой сладостью",
  },
};

const FLAVOR_AXES: (keyof FlavorProfile)[] = [
  "acidity",
  "sweetness",
  "body",
  "aroma",
  "finish",
];

const UNKNOWN_TASTE_SCORE = 0.5;
const KEYWORD_BONUS_STEP = 0.08;
const KEYWORD_BONUS_CAP = 0.4;

function lotSearchText(lot: Lot): string {
  return [...lot.tags, ...lot.sensory, lot.cupNote].join(" ").toLowerCase();
}

function tasteScore(lot: Lot, taste: TasteAnswer): number {
  if (taste === "unknown") return UNKNOWN_TASTE_SCORE;

  const profile = lot.flavorProfile;
  const { target, keywords } = TASTE_PROFILES[taste];

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
  const keywordBonus = Math.min(
    KEYWORD_BONUS_CAP,
    matchedKeywords.length * KEYWORD_BONUS_STEP,
  );

  return closeness + keywordBonus;
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

function profileDistance(a: FlavorProfile, b: FlavorProfile): number {
  const sumSquares = FLAVOR_AXES.reduce((sum, axis) => {
    const diff = (a[axis] ?? 5) - (b[axis] ?? 5);
    return sum + diff * diff;
  }, 0);
  return Math.sqrt(sumSquares);
}

const MAX_PROFILE_DISTANCE = Math.sqrt(FLAVOR_AXES.length * 10 * 10);
const NEW_RELEVANCE_FLOOR = 0.45;
const UNUSUAL_ENTRY_SET_BONUS = 0.15;

function averageProfile(lots: Lot[]): FlavorProfile {
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

function noveltyBonus(
  lot: Lot,
  taste: number,
  novelty: NoveltyAnswer,
  topPick: Lot,
  corpusAverage: FlavorProfile,
): number {
  if (novelty === "familiar") return 0;

  const profile = lot.flavorProfile;
  if (!profile) return 0;

  if (novelty === "new") {
    if (taste < NEW_RELEVANCE_FLOOR) return 0;
    if (lot.id === topPick.id) return 0;
    return profileDistance(profile, topPick.flavorProfile) / MAX_PROFILE_DISTANCE;
  }

  // "unusual": how far this lot sits from the catalog's average profile,
  // plus a modest bump for lots that are structurally different (a
  // multi-origin set instead of a single lot) — both derived from real
  // data already on the lot, not an invented rarity score.
  let bonus = profileDistance(profile, corpusAverage) / MAX_PROFILE_DISTANCE;
  if (isEntryProduct(lot)) bonus += UNUSUAL_ENTRY_SET_BONUS;
  return bonus;
}

// --- Tasting history adjustment ---------------------------------------------

const HISTORY_WEIGHT = 0.2;

function historyScore(lot: Lot, history: DiscoveryHistory | undefined): number {
  if (!history) return 0;
  if (history.dislikedLotIds?.includes(lot.id)) return -1;
  if (history.likedLotIds?.includes(lot.id)) return 1;
  return 0;
}

// --- Composite scoring -------------------------------------------------------

const TASTE_WEIGHT = 0.6;
const BREW_WEIGHT = 0.25;
const NOVELTY_WEIGHT = 0.15;
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
    return getWhoLikesIt(lot);
  }

  const { reason: direction } = TASTE_PROFILES[answers.taste];
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
      historyScore(lot, history) * HISTORY_WEIGHT;
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
