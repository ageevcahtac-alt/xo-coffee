"use client";

import { useCart } from "@/src/context/CartContext";
import { formatPrice } from "@/src/lib/format";
import WholeBeanNotice from "@/src/components/WholeBeanNotice";
import FreeShippingBar from "@/src/components/cart/FreeShippingBar";

export default function CartItemsView({
  onCheckout,
}: {
  onCheckout: () => void;
}) {
  const { items, removeItem, setQuantity, totalPrice } = useCart();

  return (
    <>
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {items.length === 0 ? (
          <p className="text-sm text-charcoal/60">
            Корзина пуста. Выберите лот в каталоге.
          </p>
        ) : (
          <>
            <ul className="space-y-6">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex gap-4 border-b border-charcoal/10 pb-6"
                >
                  <div className="flex-1">
                    <p className="font-display text-base font-semibold text-burgundy">
                      {item.name}
                    </p>
                    <p className="text-xs uppercase tracking-[0.1em] text-charcoal/50">
                      {item.country} · цельное зерно
                    </p>

                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex items-center border border-charcoal/20">
                        <button
                          type="button"
                          aria-label="Уменьшить количество"
                          onClick={() =>
                            setQuantity(item.id, item.quantity - 1)
                          }
                          className="flex h-11 w-11 items-center justify-center text-charcoal/70 transition-transform active:scale-90 hover:text-burgundy"
                        >
                          −
                        </button>
                        <span className="flex h-11 w-9 items-center justify-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label="Увеличить количество"
                          onClick={() =>
                            setQuantity(item.id, item.quantity + 1)
                          }
                          className="flex h-11 w-11 items-center justify-center text-charcoal/70 transition-transform active:scale-90 hover:text-burgundy"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-xs uppercase tracking-[0.1em] text-charcoal/50 underline-offset-2 transition-colors hover:text-burgundy hover:underline"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>

                  <span className="font-display text-sm font-semibold text-burgundy">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-6 space-y-4">
              <FreeShippingBar subtotal={totalPrice} />
              <WholeBeanNotice />
            </div>
          </>
        )}
      </div>

      <div className="border-t border-charcoal/15 px-6 py-6">
        <div className="mb-5 flex items-center justify-between">
          <span className="text-sm uppercase tracking-[0.1em] text-charcoal/60">
            Итого
          </span>
          <span className="font-display text-xl font-semibold text-burgundy">
            {formatPrice(totalPrice)}
          </span>
        </div>
        <button
          type="button"
          disabled={items.length === 0}
          onClick={onCheckout}
          className="flex h-14 w-full items-center justify-center bg-burgundy text-sm font-semibold uppercase tracking-[0.15em] text-cream transition-all active:scale-[0.98] hover:bg-burgundy-dark disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        >
          Перейти к оформлению
        </button>
      </div>
    </>
  );
}
