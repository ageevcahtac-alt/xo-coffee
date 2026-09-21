"use client";

import { formatVariantLabel } from "@/src/lib/variants";
import type { LotVariant } from "@/src/types/lot";

/** Packaging choice for one product: "250 г — 1 234 ₽" / "1 кг — 4 200 ₽".
 *  Shows weight and price only — no quantities on hand. */
export default function VariantPicker({
  variants,
  selectedId,
  onSelect,
  label,
}: {
  variants: LotVariant[];
  selectedId: string;
  onSelect: (variantId: string) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {variants.map((variant) => {
        const selected = variant.id === selectedId;
        return (
          <button
            key={variant.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(variant.id)}
            className={`flex min-h-10 items-center border px-3 text-xs font-semibold text-burgundy transition-all active:scale-95 ${
              selected
                ? "border-accent bg-accent-surface"
                : "border-border hover:border-accent/50"
            }`}
          >
            {formatVariantLabel(variant)}
          </button>
        );
      })}
    </div>
  );
}
