import { formatPrice } from "@/src/lib/format";
import type { Lot } from "@/src/types/lot";
import type { OrderPayloadItem } from "@/src/types/order";

/**
 * Cross-checks an incoming order against the server-side catalog (Admin's
 * published products). The browser is not a trusted source for prices or
 * ids, but checkout must never be blocked by this check — orders are only
 * notified to Telegram and there is no order persistence to protect — so a
 * discrepancy becomes a visible warning line for whoever processes the order
 * instead of a rejection.
 */
export function findCatalogDiscrepancies(
  items: OrderPayloadItem[],
  lots: Lot[],
): string[] {
  const byId = new Map(lots.map((lot) => [lot.id, lot]));
  const warnings: string[] = [];

  for (const item of items) {
    const lot = byId.get(item.lotId);
    if (!lot) {
      warnings.push(`«${item.name}» — нет в опубликованном каталоге (снят с публикации или неизвестный id)`);
    } else if (lot.price !== item.price) {
      warnings.push(
        `«${item.name}» — цена в заказе ${formatPrice(item.price)}, в каталоге ${formatPrice(lot.price)}`,
      );
    }
  }

  return warnings;
}
