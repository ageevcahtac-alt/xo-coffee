"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import { useCart } from "@/src/context/CartContext";
import VariantPicker from "@/src/components/VariantPicker";
import { buildCartItem } from "@/src/lib/cartItems";
import { formatPrice } from "@/src/lib/format";
import { getOrderableVariants, resolveVariant } from "@/src/lib/variants";
import type { Lot } from "@/src/types/lot";

/**
 * Packaging choice + price + "В корзину" for one lot. The cart line it adds
 * carries the selected variant's id. A lot with no orderable packaging shows
 * no price and no buy button — a weight or price is never invented.
 *
 * `children` render next to the buy button (e.g. a "Паспорт" link).
 */
export default function LotPurchaseControls({
  lot,
  showPrice = true,
  buttonClassName,
  children,
}: {
  lot: Lot;
  showPrice?: boolean;
  buttonClassName: string;
  children?: ReactNode;
}) {
  const { addItem, flyToCart } = useCart();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const variants = getOrderableVariants(lot);
  const variant = resolveVariant(lot, selectedId);

  if (!variant) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-3">
        <span className="text-xs text-text/65">Фасовка скоро появится</span>
        {children && <div className="flex shrink-0 gap-2">{children}</div>}
      </div>
    );
  }

  const handleAdd = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    flyToCart(event.currentTarget.getBoundingClientRect());
    addItem(buildCartItem(lot, variant));
  };

  return (
    // The card this sits in opens a lot on click — picking a packaging must not.
    <div className="space-y-3" onClick={(event) => event.stopPropagation()}>
      {variants.length > 1 && (
        <VariantPicker
          variants={variants}
          selectedId={variant.id}
          onSelect={setSelectedId}
          label={`Фасовка: ${lot.name}`}
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-3">
        {showPrice && (
          <span className="shrink-0 whitespace-nowrap font-display text-lg font-semibold text-burgundy">
            {formatPrice(variant.price)}
          </span>
        )}
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={handleAdd} className={buttonClassName}>
            В корзину
          </button>
          {children}
        </div>
      </div>
    </div>
  );
}
