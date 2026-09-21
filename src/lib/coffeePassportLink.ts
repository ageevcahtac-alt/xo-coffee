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
 * The URL shape comes from NEXT_PUBLIC_COFFEE_PASSPORT_LOT_URL_TEMPLATE (a
 * `{lotId}` placeholder, substituted with the public id). Unset, it falls back
 * to the Coffee Passport deployment's public lot route
 * `/passport/<public_id>` on https://coffee-passport.onrender.com (the
 * deployment named in that repository's README).
 */
export const DEFAULT_COFFEE_PASSPORT_LOT_URL_TEMPLATE =
  "https://coffee-passport.onrender.com/passport/{lotId}";

export function getCoffeePassportUrl(
  lot: Pick<Lot, "passportPublicId">,
  template: string | undefined = process.env.NEXT_PUBLIC_COFFEE_PASSPORT_LOT_URL_TEMPLATE,
): string | null {
  const publicId = lot.passportPublicId?.trim();
  if (!publicId) return null;
  const effective = template && template.includes("{lotId}")
    ? template
    : DEFAULT_COFFEE_PASSPORT_LOT_URL_TEMPLATE;
  return effective.replace("{lotId}", encodeURIComponent(publicId));
}
