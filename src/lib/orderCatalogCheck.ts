import { formatPrice } from "@/src/lib/format";
import { formatWeight } from "@/src/lib/variants";
import type { Lot } from "@/src/types/lot";
import type { OrderPayloadItem } from "@/src/types/order";

/**
 * Cross-checks an incoming order against the server-side catalog (Admin's
 * published products, matched by packaging `variantId`). The browser is not a
 * trusted source for prices or ids — Admin prices the order itself — so this
 * only turns a discrepancy into a visible warning line for whoever processes
 * the order; it never rejects anything.
 */
export function findCatalogDiscrepancies(
  items: OrderPayloadItem[],
  lots: Lot[],
): string[] {
  const byVariant = new Map(
    lots.flatMap((lot) => (lot.variants ?? []).map((variant) => [variant.id, variant] as const)),
  );
  const warnings: string[] = [];

  for (const item of items) {
    const variant = byVariant.get(item.variantId);
    if (!variant) {
      warnings.push(`«${item.name}» — фасовки нет в опубликованном каталоге (снята с публикации или неизвестный id)`);
      continue;
    }
    if (variant.price !== item.price) {
      warnings.push(
        `«${item.name}» — цена в заказе ${formatPrice(item.price)}, в каталоге ${formatPrice(variant.price)}`,
      );
    }
    if (variant.weightGrams !== item.weightGrams) {
      warnings.push(
        `«${item.name}» — фасовка в заказе ${formatWeight(item.weightGrams)}, в каталоге ${formatWeight(variant.weightGrams)}`,
      );
    }
  }

  return warnings;
}
