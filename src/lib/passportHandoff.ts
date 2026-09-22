import type { TastingRecord } from "@/src/types/coffeePassport";

/**
 * The tasting handed to Coffee Passport (contract v1, Coffee Passport commit
 * 0f2000d): a URL *fragment*, so it never reaches a server or its logs.
 *
 *   #src=xo-store&v=1&acidity=&sweetness=&body=&overall=&brew=&note=&id=
 *
 * Only the buyer's own rating travels — no name, phone, email, address, order
 * id, variant id, price or stock. The rating belongs to the Canonical Lot, so
 * nothing about the packaging is (or could be) in it.
 */

/** Coffee Passport rejects a longer note (the whole payload, not a truncation). */
export const HANDOFF_NOTE_MAX_LENGTH = 500;
const HANDOFF_ID_MAX_LENGTH = 64;

/** Store's brew keys -> Coffee Passport's BREWING_METHODS ids. */
const BREW_TO_PASSPORT: Record<TastingRecord["brewMethod"], string> = {
  v60: "v60",
  immersion: "immersion",
  espresso: "espresso",
  other: "custom",
};

const isScore = (value: number) => Number.isInteger(value) && value >= 1 && value <= 5;

/**
 * A stable idempotency key for ONE saved rating: derived from the tasting
 * record's own id (created once at first save, kept when the rating is later
 * edited), never regenerated on render. Coffee Passport accepts
 * [A-Za-z0-9_-]{1,64}; the record id is `<lotId>-<uuid>` (73 chars), so the
 * unique tail is kept.
 */
export function getHandoffId(record: Pick<TastingRecord, "id">): string | null {
  const clean = record.id.replace(/[^A-Za-z0-9_-]/g, "");
  const key = clean.slice(-HANDOFF_ID_MAX_LENGTH);
  return key.length > 0 ? key : null;
}

/** The fragment (with leading `#`) for this saved tasting, or "" when there is
 *  nothing valid to hand over — never an invented rating. */
export function buildTastingFragment(record: TastingRecord | null | undefined): string {
  if (!record) return "";
  const { acidity, sweetness, body, overall } = record.rating;
  if (![acidity, sweetness, body, overall].every(isScore)) return "";

  const params = new URLSearchParams({
    src: "xo-store",
    v: "1",
    acidity: String(acidity),
    sweetness: String(sweetness),
    body: String(body),
    overall: String(overall),
    brew: BREW_TO_PASSPORT[record.brewMethod] ?? "custom",
  });
  const note = record.note.trim().slice(0, HANDOFF_NOTE_MAX_LENGTH);
  if (note) params.set("note", note);
  const id = getHandoffId(record);
  if (id) params.set("id", id);
  return `#${params.toString()}`;
}
