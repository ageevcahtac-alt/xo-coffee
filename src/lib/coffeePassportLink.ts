import type { Lot } from "@/src/types/lot";

/**
 * Single centralized builder for links to the external Coffee Passport
 * platform. Every entry point that needs one must call this — never
 * construct the URL inline.
 *
 * Identity rule: the Coffee Passport lot is addressed by the Canonical Lot's
 * `passport_public_id` (e.g. "LOT-XO-COL-004", carried on `Lot.passportPublicId`),
 * and by nothing else. Not by the Store product id, and never by a packaging
 * `variant_id` — 250 g and 1 kg of one coffee are the same Canonical Lot and
 * therefore the same link. A lot with no `passportPublicId` gets no link
 * rather than a guessed one.
 *
 * URL shape: `<base>/passport/<public_id>`. The base comes from the
 * SERVER-ONLY env `COFFEE_PASSPORT_PUBLIC_BASE_URL` (never a NEXT_PUBLIC_
 * variable — the value is read in a server component and passed down as a
 * prop), defaulting to the platform's current public host.
 */

export const DEFAULT_COFFEE_PASSPORT_PUBLIC_BASE = "https://coffeepassport.ru";

export const COFFEE_PASSPORT_LOT_PATH_TEMPLATE = "/passport/{lotId}";

function normalizeBase(base: string | undefined): string {
  const trimmed = base?.trim().replace(/\/+$/, "");
  return trimmed ? trimmed : DEFAULT_COFFEE_PASSPORT_PUBLIC_BASE;
}

export function getCoffeePassportUrl(
  lot: Pick<Lot, "passportPublicId">,
  baseUrl?: string,
): string | null {
  const publicId = lot.passportPublicId?.trim();
  if (!publicId) return null;
  const base = normalizeBase(baseUrl);
  return `${base}${COFFEE_PASSPORT_LOT_PATH_TEMPLATE.replace(
    "{lotId}",
    encodeURIComponent(publicId),
  )}`;
}
