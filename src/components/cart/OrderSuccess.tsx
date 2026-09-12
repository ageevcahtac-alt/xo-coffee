"use client";

import Link from "next/link";
import { CARRIER_LABELS } from "@/src/components/cart/CheckoutForm";
import { PAYMENT_LABELS, type OrderDetails } from "@/src/components/cart/PaymentStep";

export default function OrderSuccess({
  order,
  onClose,
}: {
  order: OrderDetails;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-8 py-10 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full border border-success text-success">
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M5 13l4 4L19 7" />
        </svg>
      </span>

      <h2 className="mt-6 font-display text-2xl font-semibold text-burgundy">
        Заказ №{order.orderNumber} оформлен
      </h2>

      <p className="mt-4 max-w-xs leading-relaxed text-charcoal/75">
        {order.fulfillment === "pickup"
          ? "Ваш кофе сформирован и будет ждать вас в кофейне. Мы обжигаем и упаковываем зерно бережно — важен первый глоток."
          : "Ваш кофе сформирован и готовится к отправке. Мы обжигаем и упаковываем зерно бережно — важен первый глоток."}
      </p>

      <div className="mt-6 w-full max-w-xs space-y-2 border border-charcoal/15 bg-cream-dark px-5 py-4 text-left text-sm">
        <div className="flex justify-between">
          <span className="text-charcoal/50">Получатель</span>
          <span className="font-medium">{order.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-charcoal/50">Получение</span>
          <span className="font-medium">
            {order.fulfillment === "pickup"
              ? "Самовывоз"
              : CARRIER_LABELS[order.carrier]}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="shrink-0 text-charcoal/50">
            {order.fulfillment === "pickup" ? "Точка" : "Адрес"}
          </span>
          <span className="text-right font-medium">{order.address}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="shrink-0 text-charcoal/50">Оплата</span>
          <span className="text-right font-medium">
            {PAYMENT_LABELS[order.paymentMethod]}
          </span>
        </div>
      </div>

      <p className="mt-6 text-xs uppercase tracking-[0.1em] text-charcoal/50">
        Чек и трек-номер придут на {order.email}
      </p>

      {order.items.length > 0 && (
        <div className="mt-6 w-full max-w-xs border border-border bg-cream-dark px-5 py-4 text-left">
          <p className="font-display text-sm font-semibold text-burgundy">
            Coffee Passport
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-charcoal/70">
            Попробуйте {order.items.length > 1 ? "эти лоты" : "этот лот"} и
            сохраните своё впечатление в Coffee Passport — рецепт
            приготовления и место для собственной заметки о чашке.
          </p>
          <Link
            href={`/passport/${order.orderNumber}`}
            onClick={onClose}
            className="mt-4 flex h-11 w-full items-center justify-center bg-burgundy text-xs font-semibold uppercase tracking-[0.12em] text-cream transition-all active:scale-95 hover:bg-burgundy-dark"
          >
            Открыть Coffee Passport
          </Link>
        </div>
      )}

      <button
        type="button"
        onClick={onClose}
        className="mt-4 flex h-12 w-full max-w-xs items-center justify-center border border-burgundy px-8 text-sm font-semibold uppercase tracking-[0.15em] text-burgundy transition-all active:scale-95 hover:bg-burgundy hover:text-cream"
      >
        Продолжить покупки
      </button>
    </div>
  );
}
