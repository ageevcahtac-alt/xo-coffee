import { formatPrice } from "@/src/lib/format";
import type { Lot, LotVariant } from "@/src/types/lot";

/** 250 → "250 г", 1000 → "1 кг", 1500 → "1,5 кг". */
export function formatWeight(grams: number): string {
  if (grams >= 1000) return `${(grams / 1000).toLocaleString("ru-RU")} кг`;
  return `${grams} г`;
}

/** "250 г — 1 234 ₽" */
export function formatVariantLabel(variant: LotVariant): string {
  return `${formatWeight(variant.weightGrams)} — ${formatPrice(variant.price)}`;
}

/**
 * The packagings a buyer can order. Orderability comes only from Admin's
 * `availableForOrder`: the Store has no stock figure, and zero physical stock
 * never disables a packaging (Admin turns the shortfall into production).
 */
export function getOrderableVariants(lot: Lot): LotVariant[] {
  return (lot.variants ?? []).filter((variant) => variant.availableForOrder);
}

/** The variant to show as selected: the buyer's pick if it is still orderable,
 *  otherwise the first (lightest) one; null when there is nothing to order. */
export function resolveVariant(lot: Lot, selectedId?: string | null): LotVariant | null {
  const variants = getOrderableVariants(lot);
  return variants.find((variant) => variant.id === selectedId) ?? variants[0] ?? null;
}

/** A compact price for lists where no packaging is selected yet: the price
 *  for a single packaging, "от …" for several, null when there is none —
 *  a weightless legacy price is never shown as an offer. */
export function getLotPriceLabel(lot: Lot): string | null {
  const variants = getOrderableVariants(lot);
  if (variants.length === 0) return null;
  const min = Math.min(...variants.map((variant) => variant.price));
  return variants.length === 1 ? formatPrice(min) : `от ${formatPrice(min)}`;
}
