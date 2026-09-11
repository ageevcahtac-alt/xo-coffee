/**
 * Single centralized builder for links to the external Coffee Passport
 * platform. Every entry point that needs one (Lot card/modal CTA, a future
 * QR code, order confirmation, etc.) must call this — never construct the
 * URL inline.
 *
 * READ THIS BEFORE CHANGING IT. There is no confirmed external Coffee
 * Passport platform URL anywhere in this repository (verified by audit —
 * see P14_XO_COFFEE_COFFEE_PASSPORT_INTEGRATION.md). This repo's own
 * `/passport/[orderNumber]` pages (src/lib/coffeePassport.ts,
 * src/components/passport/*) are XO COFFEE's existing, order-scoped,
 * embedded post-purchase feature — they are NOT the separate Coffee
 * Passport platform this bridge is for, and this file does not link to
 * them. Until the real platform's URL shape is known, this returns `null`
 * and every caller must not render a link rather than guess.
 *
 * The whole URL template — not just an origin — is read from
 * NEXT_PUBLIC_COFFEE_PASSPORT_LOT_URL_TEMPLATE, deliberately, so that this
 * code never has to assume a path convention (e.g. "/lot/:id" vs
 * "/l/:id" vs a query string) that hasn't been confirmed. Whoever owns the
 * Coffee Passport platform supplies the full template with a `{lotId}`
 * placeholder once it exists; this function only does the substitution.
 *
 * `lotId` is the existing `Lot.id` (src/types/lot.ts) — already a stable,
 * unique, immutable, URL-safe slug (e.g. "lot-014"), and already the same
 * identifier threaded through Cart -> Order (see CartItem.id and
 * OrderPayloadItem.lotId / OrderRecordItem.lotId). No new identifier was
 * invented for this bridge.
 */
export function getCoffeePassportUrl(lotId: string): string | null {
  const template = process.env.NEXT_PUBLIC_COFFEE_PASSPORT_LOT_URL_TEMPLATE;
  if (!template || !template.includes("{lotId}")) {
    // Unset, or malformed (missing the placeholder) — never produce a
    // link that doesn't actually resolve to this specific Lot.
    return null;
  }
  return template.replace("{lotId}", encodeURIComponent(lotId));
}
