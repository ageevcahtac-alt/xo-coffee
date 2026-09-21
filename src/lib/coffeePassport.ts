import type {
  BrewMethodKey,
  MyCupRating,
  OrderRecord,
  OrderRecordItem,
  TastingRecord,
} from "@/src/types/coffeePassport";

/**
 * Local-only persistence for the post-purchase Coffee Passport (orders
 * captured at checkout, and the tasting records a person adds afterwards).
 * No account, no backend, no network — everything lives in this browser's
 * localStorage, namespaced the same way CartContext already does.
 *
 * Every read is validated defensively: a corrupted or hand-edited
 * localStorage value is dropped rather than trusted, so a bad record can't
 * crash the Passport.
 */

const ORDERS_KEY = "xo-coffee-orders";
const TASTINGS_KEY = "xo-coffee-tastings";

const RATING_MIN = 1;
const RATING_MAX = 5;
const NOTE_MAX_LENGTH = 2000;

const VALID_BREW_METHODS = new Set<BrewMethodKey>(["v60", "immersion", "espresso", "other"]);

function isValidBrewMethod(value: unknown): value is BrewMethodKey {
  return typeof value === "string" && VALID_BREW_METHODS.has(value as BrewMethodKey);
}

function readArray(key: string): unknown[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeArray<T>(key: string, value: T[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore write failures (private browsing, storage quota, etc.) — the
    // tasting still worked in this session, it just won't persist.
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isValidDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isValidOrderRecordItem(value: unknown): value is OrderRecordItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    isNonEmptyString(item.lotId) &&
    typeof item.name === "string" &&
    typeof item.quantity === "number" &&
    Number.isFinite(item.quantity) &&
    item.quantity > 0
  );
}

function isValidOrderRecord(value: unknown): value is OrderRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    isNonEmptyString(record.orderNumber) &&
    isValidDate(record.createdAt) &&
    Array.isArray(record.items) &&
    record.items.length > 0 &&
    record.items.every(isValidOrderRecordItem)
  );
}

function isValidRating(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= RATING_MIN &&
    value <= RATING_MAX
  );
}

function isValidMyCupRating(value: unknown): value is MyCupRating {
  if (!value || typeof value !== "object") return false;
  const rating = value as Record<string, unknown>;
  return (
    isValidRating(rating.acidity) &&
    isValidRating(rating.sweetness) &&
    isValidRating(rating.body) &&
    isValidRating(rating.overall)
  );
}

function isValidTastingRecord(value: unknown): value is TastingRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (
    !isNonEmptyString(record.id) ||
    !isNonEmptyString(record.orderNumber) ||
    !isNonEmptyString(record.lotId) ||
    !isValidBrewMethod(record.brewMethod) ||
    !isValidDate(record.createdAt) ||
    typeof record.note !== "string" ||
    !isValidMyCupRating(record.rating)
  ) {
    return false;
  }
  if (record.component !== undefined && typeof record.component !== "string") {
    return false;
  }
  return true;
}

export function clampRating(value: number): number {
  return Math.min(RATING_MAX, Math.max(RATING_MIN, Math.round(value)));
}

export function createTastingId(lotId: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${lotId}-${crypto.randomUUID()}`;
  }
  return `${lotId}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

/**
 * One entry per Canonical Lot. A cart line is a packaging (variant), so an
 * order of 250 g + 1 kg of the same coffee arrives here as two items with the
 * same `lotId`; for the Passport that is ONE coffee, with the quantities
 * summed. The variant is commercial data (cart / Admin order) and is
 * deliberately not part of this record.
 */
export function mergeOrderItemsByLot(items: OrderRecordItem[]): OrderRecordItem[] {
  const merged = new Map<string, OrderRecordItem>();
  for (const item of items) {
    const existing = merged.get(item.lotId);
    merged.set(
      item.lotId,
      existing ? { ...existing, quantity: existing.quantity + item.quantity } : { ...item },
    );
  }
  return [...merged.values()];
}

export function saveOrderRecord(input: OrderRecord): void {
  if (!isValidOrderRecord(input)) return;
  const record = { ...input, items: mergeOrderItemsByLot(input.items) };
  const existing = readArray(ORDERS_KEY).filter(isValidOrderRecord);
  const withoutDuplicate = existing.filter(
    (order) => order.orderNumber !== record.orderNumber,
  );
  writeArray(ORDERS_KEY, [...withoutDuplicate, record]);
}

export function getOrderRecord(orderNumber: string): OrderRecord | null {
  if (!isNonEmptyString(orderNumber)) return null;
  const all = readArray(ORDERS_KEY).filter(isValidOrderRecord);
  const found = all.find((order) => order.orderNumber === orderNumber);
  // Orders saved before packaging variants may hold one lot several times.
  return found ? { ...found, items: mergeOrderItemsByLot(found.items) } : null;
}

export function saveTastingRecord(record: TastingRecord): void {
  const note = record.note.slice(0, NOTE_MAX_LENGTH);
  const safeRecord: TastingRecord = {
    ...record,
    note,
    rating: {
      acidity: clampRating(record.rating.acidity),
      sweetness: clampRating(record.rating.sweetness),
      body: clampRating(record.rating.body),
      overall: clampRating(record.rating.overall),
    },
  };
  if (!isValidTastingRecord(safeRecord)) return;

  const existing = readArray(TASTINGS_KEY).filter(isValidTastingRecord);
  const withoutSameId = existing.filter((tasting) => tasting.id !== safeRecord.id);
  writeArray(TASTINGS_KEY, [...withoutSameId, safeRecord]);
}

/** Newest first — deterministic since createdAt is an ISO string. */
export function getTastingRecordsForLot(lotId: string): TastingRecord[] {
  if (!isNonEmptyString(lotId)) return [];
  return readArray(TASTINGS_KEY)
    .filter(isValidTastingRecord)
    .filter((tasting) => tasting.lotId === lotId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getAllTastingRecords(): TastingRecord[] {
  return readArray(TASTINGS_KEY)
    .filter(isValidTastingRecord)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export const LIKED_OVERALL_THRESHOLD = 4;
export const DISLIKED_OVERALL_THRESHOLD = 2;

/**
 * Derives a liked/disliked lot signal from saved tasting overall ratings —
 * the seam Discovery can use to personalize ranking (see
 * `DiscoveryHistory` in src/lib/discovery.ts). A lot with mixed tastings
 * (e.g. loved once, disliked another time) counts toward both lists rather
 * than guessing which one "wins".
 */
export function getLikedDislikedLotIds(): {
  likedLotIds: string[];
  dislikedLotIds: string[];
} {
  const records = getAllTastingRecords();
  const liked = new Set<string>();
  const disliked = new Set<string>();
  for (const record of records) {
    if (record.rating.overall >= LIKED_OVERALL_THRESHOLD) liked.add(record.lotId);
    if (record.rating.overall <= DISLIKED_OVERALL_THRESHOLD) disliked.add(record.lotId);
  }
  return { likedLotIds: [...liked], dislikedLotIds: [...disliked] };
}

export type { BrewMethodKey, MyCupRating, OrderRecord, OrderRecordItem, TastingRecord };
