import { FREE_SHIPPING_THRESHOLD } from "@/src/lib/shop";
import { formatPrice } from "@/src/lib/format";

export default function FreeShippingBar({ subtotal }: { subtotal: number }) {
  const reached = subtotal >= FREE_SHIPPING_THRESHOLD;
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  return (
    <div className="border border-border bg-cream-dark px-4 py-3">
      <p className="text-xs leading-relaxed text-charcoal/75">
        {reached ? (
          <>
            <span className="font-semibold text-burgundy">
              Бесплатная доставка
            </span>{" "}
            уже включена в заказ.
          </>
        ) : (
          <>
            Добавьте товаров ещё на{" "}
            <span className="font-semibold text-burgundy">
              {formatPrice(FREE_SHIPPING_THRESHOLD - subtotal)}
            </span>{" "}
            — и доставка будет бесплатной.
          </>
        )}
      </p>
      <div className="mt-2 h-1 w-full bg-charcoal/10">
        <div
          className="h-1 bg-gold transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
