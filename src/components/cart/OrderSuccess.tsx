"use client";

import Link from "next/link";
import { CARRIER_LABELS } from "@/src/components/cart/CheckoutForm";
import { PAYMENT_LABELS, type OrderDetails } from "@/src/components/cart/PaymentStep";
import { useCatalog } from "@/src/context/CatalogContext";
import { getCoffeePassportUrl } from "@/src/lib/coffeePassportLink";
import { formatPrice } from "@/src/lib/format";
import type { Lot } from "@/src/types/lot";

// The shop's existing published contacts (see Footer) — the verified support
// channel. No automated emails or client-facing Telegram exist yet, so the
// success screen must not promise them.
const SUPPORT_EMAIL = "hello@xocoffee.ru";
const SUPPORT_PHONE = "+7 (900) 000-00-00";

export default function OrderSuccess({
  order,
  onClose,
}: {
  order: OrderDetails;
  onClose: () => void;
}) {
  const { lots: LOTS } = useCatalog();

  // Link to the REAL Coffee Passport lot via the single verified builder —
  // same source as LotPassportModal/passportContinuation. Lots without a
  // passport_public_id yield no URL and get no button (nothing guessed).
  const passportLots = order.items
    .map((item) => LOTS.find((lot) => lot.id === item.lotId) ?? null)
    .filter((lot): lot is Lot => lot !== null)
    .map((lot) => ({ lot, url: getCoffeePassportUrl(lot) }))
    .filter((entry): entry is { lot: Lot; url: string } => entry.url !== null);

  // No method is "paid" here: acquiring is not wired up, so the honest state
  // for every method is "заказ оформлен" plus the manual payment instruction.
  const paymentNote =
    order.paymentMethod === "card"
      ? "Оплата картой сейчас работает в тестовом режиме — реальное списание не выполнялось."
      : order.paymentMethod === "invoice"
        ? `Счёт с реквизитами для оплаты отправляем на ${order.email} после подтверждения заказа.`
        : "Оплата по СБП пока не выполнена — реквизиты для оплаты отправляем после подтверждения заказа.";

  return (
    <div
      role="status"
      className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-8 py-10 text-center"
    >
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

      {order.items.length > 0 && (
        <div className="mt-6 w-full max-w-xs border border-border bg-cream-dark px-5 py-4 text-left">
          <p className="font-display text-sm font-semibold text-burgundy">
            Состав заказа на этом устройстве
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-charcoal/70">
            Страница с составом заказа и дегустационными заметками сохранена в
            этом браузере и доступна только на этом устройстве.
          </p>
          <Link
            href={`/passport/${order.orderNumber}`}
            onClick={onClose}
            className="mt-4 flex h-11 w-full items-center justify-center border border-burgundy text-xs font-semibold uppercase tracking-[0.12em] text-burgundy transition-all active:scale-95 hover:bg-burgundy hover:text-cream"
          >
            Открыть состав заказа
          </Link>
        </div>
      )}

      {passportLots.length > 0 && (
        <div className="mt-6 w-full max-w-xs border border-border bg-cream-dark px-5 py-4 text-left">
          <p className="font-display text-sm font-semibold text-burgundy">
            Познакомьтесь с вашим кофе в Coffee Passport
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-charcoal/70">
            Паспорт лота — профессиональный профиль зерна от обжарщика:
            терруар, обработка, сенсорика. Там можно сохранять собственные
            дегустационные заметки и вести историю дегустаций.
          </p>
          {passportLots.length === 1 ? (
            <a
              href={passportLots[0].url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex h-11 w-full items-center justify-center bg-burgundy text-xs font-semibold uppercase tracking-[0.12em] text-cream transition-all active:scale-95 hover:bg-burgundy-dark"
            >
              Открыть паспорт лота
            </a>
          ) : (
            <ul className="mt-3 space-y-2">
              {passportLots.map(({ lot, url }) => (
                <li key={lot.id}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-burgundy underline-offset-2 hover:underline"
                  >
                    {lot.country || lot.name} — Открыть паспорт лота →
                  </a>
                </li>
              ))}
            </ul>
          )}
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
