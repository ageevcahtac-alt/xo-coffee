"use client";

import { CARRIER_LABELS } from "@/src/components/cart/CheckoutForm";
import { PAYMENT_LABELS, type OrderDetails } from "@/src/components/cart/PaymentStep";
import { formatPrice } from "@/src/lib/format";

// The shop's existing published contacts (see Footer) — the verified support
// channel. No automated emails exist yet, so the success screen must not
// promise them.
const SUPPORT_EMAIL = "hello@xocoffee.ru";
const SUPPORT_PHONE = "+7 (900) 000-00-00";

// The real Coffee Passport — order readiness is tracked there, not in a
// Store-side cabinet (the local /passport pages were removed). Plain link,
// no automatic redirect.
const COFFEE_PASSPORT_URL = "https://coffeepassport.ru";

export default function OrderSuccess({
  order,
  onClose,
}: {
  order: OrderDetails;
  onClose: () => void;
}) {
  // No method is "paid" here: acquiring is not wired up, so the honest state
  // for every method is "заказ оформлен" plus the manual payment instruction.
  const paymentNote =
    order.paymentMethod === "card"
      ? "Оплата картой сейчас работает в тестовом режиме — реальное списание не выполнялось."
      : order.paymentMethod === "invoice"
        ? `Счёт с реквизитами для оплаты направим на ${order.email} после подтверждения заказа.`
        : "Реквизиты для оплаты по СБП направим после подтверждения заказа.";

  return (
    // m-auto on the inner block (instead of justify-center on the scroller)
    // keeps the receipt centered when it is short, but fully scrollable to
    // the very top when it is tall — justify-center used to clip the header
    // and the icon above the scroll viewport on small screens.
    <div role="status" className="flex flex-1 flex-col overflow-y-auto">
      <div className="m-auto flex w-full flex-col items-center px-8 py-10 text-center">
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
          {paymentNote} Как только оплата подтвердится, приступим к обжарке и
          сборке заказа.
        </p>

        <div className="mt-6 w-full max-w-xs border border-border bg-cream-dark px-5 py-4 text-left">
          <p className="font-display text-sm font-semibold text-burgundy">
            Готовность заказа удобно отслеживать в Coffee Passport
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-charcoal/70">
            Coffee Passport — ваш личный кабинет обжарщика: статус заказа,
            паспорта лотов и дегустационные заметки.
          </p>
          <a
            href={COFFEE_PASSPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex h-11 w-full items-center justify-center whitespace-nowrap bg-accent px-4 text-xs font-semibold uppercase tracking-[0.12em] text-cream transition-all active:scale-95 hover:bg-accent-hover"
          >
            Статус в паспорте
          </a>
        </div>

        <div className="mt-6 w-full max-w-xs space-y-2 border border-charcoal/15 bg-cream-dark px-5 py-4 text-left text-sm">
          <div className="flex justify-between">
            <span className="text-charcoal/65">Получатель</span>
            <span className="font-medium">{order.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-charcoal/65">Получение</span>
            <span className="font-medium">
              {order.fulfillment === "pickup"
                ? "Самовывоз"
                : CARRIER_LABELS[order.carrier]}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="shrink-0 text-charcoal/65">
              {order.fulfillment === "pickup" ? "Точка" : "Адрес"}
            </span>
            <span className="text-right font-medium">{order.address}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="shrink-0 text-charcoal/65">Оплата</span>
            <span className="text-right font-medium">
              {PAYMENT_LABELS[order.paymentMethod]}
            </span>
          </div>
        </div>

        <div className="mt-6 w-full max-w-xs border border-border bg-cream-dark px-5 py-4 text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">
            Ваш заказ
          </p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {order.items.map((item) => (
              <li key={item.lotId} className="flex justify-between gap-4">
                <span className="text-charcoal/75">{item.name}</span>
                <span className="shrink-0 font-medium">× {item.quantity}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between border-t border-charcoal/10 pt-2 text-sm">
            <span className="text-charcoal/65">Сумма заказа</span>
            <span className="font-medium">{formatPrice(order.total)}</span>
          </div>
        </div>

        <p className="mt-6 max-w-xs text-xs leading-relaxed uppercase tracking-[0.1em] text-charcoal/65">
          Вопросы по заказу — {SUPPORT_EMAIL} или {SUPPORT_PHONE}. Назовите
          номер заказа.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 flex h-12 w-full max-w-xs items-center justify-center border border-burgundy px-8 text-sm font-semibold uppercase tracking-[0.15em] text-burgundy transition-all active:scale-95 hover:bg-accent hover:text-cream"
        >
          Продолжить покупки
        </button>
      </div>
    </div>
  );
}
