"use client";

import { useState, type FormEvent } from "react";
import { useCart } from "@/src/context/CartContext";
import { formatPrice } from "@/src/lib/format";
import { getDeliveryFee } from "@/src/lib/shop";
import { generateOrderNumber } from "@/src/lib/orderNumber";
import { CARRIER_LABELS, type ContactInfo } from "@/src/components/cart/CheckoutForm";
import type { OrderPayload, PaymentMethodCode } from "@/src/types/order";
import type { OrderRecordItem } from "@/src/types/coffeePassport";

export type PaymentMethod = PaymentMethodCode;

export type OrderDetails = ContactInfo & {
  orderNumber: string;
  paymentMethod: PaymentMethod;
  company?: { name: string; inn: string };
  // A snapshot of what was bought, captured before the cart is cleared —
  // this is what lets Success/Coffee Passport know which lots to open.
  items: OrderRecordItem[];
};

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  sbp: "Оплата по QR-коду / СБП",
  card: "Банковская карта",
  invoice: "Счёт на email (для юрлиц)",
};

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; hint: string }[] = [
  {
    value: "sbp",
    label: "Оплата по QR-коду / СБП",
    hint: "Отсканируйте камерой банковского приложения",
  },
  {
    value: "card",
    label: "Банковская карта",
    hint: "SberPay / T-Pay",
  },
  {
    value: "invoice",
    label: "Счёт на email",
    hint: "Для юрлиц — по ИНН компании",
  },
];

function generateQrPattern(size = 11) {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => Math.random() > 0.55),
  );
}

function isFinderZone(x: number, y: number, size: number) {
  const inCorner = (cx: number, cy: number) =>
    x >= cx && x < cx + 3 && y >= cy && y < cy + 3;
  return inCorner(0, 0) || inCorner(size - 3, 0) || inCorner(0, size - 3);
}

function QrPlaceholder() {
  const [grid] = useState(() => generateQrPattern());
  const size = grid.length;

  return (
    <div className="mx-auto grid aspect-square w-36 grid-cols-11 grid-rows-11 gap-[2px] border border-charcoal/15 bg-cream p-3">
      {grid.map((row, y) =>
        row.map((filled, x) => (
          <div
            key={`${x}-${y}`}
            className={
              isFinderZone(x, y, size) || filled
                ? "bg-charcoal"
                : "bg-transparent"
            }
          />
        )),
      )}
    </div>
  );
}

function formatCardNumber(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatCardExpiry(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

// Sandbox mode — no real acquiring is wired up, so the card fields ship
// pre-filled with standard test-card values for a frictionless demo.
const TEST_CARD_NUMBER = "1111 1111 1111 1111";
const TEST_CARD_EXPIRY = "12/28";
const TEST_CARD_CVC = "111";

export default function PaymentStep({
  contact,
  onBack,
  onConfirm,
}: {
  contact: ContactInfo;
  onBack: () => void;
  onConfirm: (order: OrderDetails) => void;
}) {
  const { items, totalPrice } = useCart();
  const [orderNumber] = useState(generateOrderNumber);
  const [method, setMethod] = useState<PaymentMethod>("sbp");
  const [cardNumber, setCardNumber] = useState(TEST_CARD_NUMBER);
  const [cardExpiry, setCardExpiry] = useState(TEST_CARD_EXPIRY);
  const [cardCvc, setCardCvc] = useState(TEST_CARD_CVC);
  const [companyName, setCompanyName] = useState("");
  const [inn, setInn] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const deliveryFee =
    contact.fulfillment === "pickup" ? 0 : getDeliveryFee(totalPrice);
  const grandTotal = totalPrice + deliveryFee;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const company =
      method === "invoice" ? { name: companyName, inn } : undefined;

    const payload: OrderPayload = {
      orderNumber,
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      delivery: {
        method: contact.fulfillment,
        carrier: CARRIER_LABELS[contact.carrier],
        address: contact.address,
      },
      payment: {
        method,
        company,
      },
      items: items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        packaging: "whole-bean",
      })),
      total: grandTotal,
    };

    setSubmitting(true);
    try {
      if (method === "card") {
        // Sandbox mode: simulate acquiring latency without calling a real gateway.
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error("Не удалось отправить уведомление о заказе", error);
    } finally {
      setSubmitting(false);
    }

    onConfirm({
      ...contact,
      orderNumber,
      paymentMethod: method,
      company,
      items: items.map((item) => ({
        lotId: item.id,
        name: item.name,
        quantity: item.quantity,
      })),
    });
  };

  const inputClass =
    "w-full border border-charcoal/20 bg-cream-dark px-4 py-3 text-sm text-charcoal placeholder:text-charcoal/40 outline-none transition-colors focus:border-burgundy";

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-1 flex-col overflow-hidden"
    >
      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/60 transition-transform active:scale-95 hover:text-burgundy"
        >
          ← Назад к доставке
        </button>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-dark">
            Способ оплаты
          </h3>

          <div className="mt-4 space-y-3">
            {PAYMENT_OPTIONS.map((option) => {
              const selected = method === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setMethod(option.value)}
                  className={`flex w-full items-center gap-3 border px-4 py-3 text-left transition-all duration-150 active:scale-[0.98] ${
                    selected
                      ? "border-gold bg-cream-dark shadow-md"
                      : "border-charcoal/15 hover:border-gold/50"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                      selected ? "border-burgundy" : "border-charcoal/30"
                    }`}
                  >
                    {selected && (
                      <span className="h-2 w-2 rounded-full bg-burgundy" />
                    )}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-charcoal">
                      {option.label}
                    </span>
                    <span className="block text-xs text-charcoal/50">
                      {option.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 animate-[fadeInUp_0.25s_ease-out] border border-charcoal/10 bg-cream-dark/60 p-5">
            {method === "sbp" && (
              <div className="text-center">
                <QrPlaceholder />
                <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-charcoal/70">
                  Отсканируйте QR-код камерой телефона или откройте банковское
                  приложение и выберите оплату через СБП. Подтверждение
                  приходит автоматически — просто нажмите «Подтвердить заказ»
                  ниже.
                </p>
              </div>
            )}

            {method === "card" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="border border-gold/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-gold-dark">
                    SberPay
                  </span>
                  <span className="border border-gold/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-gold-dark">
                    T-Pay
                  </span>
                  <span className="border border-charcoal/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-charcoal/50">
                    Тестовый режим
                  </span>
                </div>
                <p className="text-xs text-charcoal/50">
                  Поля заполнены тестовой картой — реальное списание не
                  выполняется.
                </p>
                <input
                  required
                  type="text"
                  inputMode="numeric"
                  value={cardNumber}
                  onChange={(event) =>
                    setCardNumber(formatCardNumber(event.target.value))
                  }
                  placeholder="0000 0000 0000 0000"
                  maxLength={19}
                  className={inputClass}
                />
                <div className="flex gap-3">
                  <input
                    required
                    type="text"
                    inputMode="numeric"
                    value={cardExpiry}
                    onChange={(event) =>
                      setCardExpiry(formatCardExpiry(event.target.value))
                    }
                    placeholder="ММ/ГГ"
                    maxLength={5}
                    className={inputClass}
                  />
                  <input
                    required
                    type="text"
                    inputMode="numeric"
                    value={cardCvc}
                    onChange={(event) =>
                      setCardCvc(event.target.value.replace(/\D/g, "").slice(0, 3))
                    }
                    placeholder="CVC"
                    maxLength={3}
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            {method === "invoice" && (
              <div className="space-y-3">
                <input
                  required
                  type="text"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  placeholder="Название компании"
                  className={inputClass}
                />
                <input
                  required
                  type="text"
                  inputMode="numeric"
                  value={inn}
                  onChange={(event) =>
                    setInn(event.target.value.replace(/\D/g, "").slice(0, 12))
                  }
                  placeholder="ИНН"
                  maxLength={12}
                  className={inputClass}
                />
                <p className="text-xs leading-relaxed text-charcoal/60">
                  Счёт с реквизитами придёт на {contact.email || "указанный email"}
                  .
                </p>
              </div>
            )}
          </div>
        </section>

        <div className="flex justify-between border-t border-charcoal/10 pt-4 font-display text-lg font-semibold text-burgundy">
          <span>К оплате</span>
          <span>{formatPrice(grandTotal)}</span>
        </div>
      </div>

      <div className="border-t border-charcoal/15 px-6 py-6">
        <button
          type="submit"
          disabled={submitting}
          className="flex h-14 w-full items-center justify-center bg-burgundy text-sm font-semibold uppercase tracking-[0.15em] text-cream transition-all active:scale-[0.98] hover:bg-burgundy-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting
            ? method === "card"
              ? "Обрабатываем платёж…"
              : "Оформляем…"
            : "Подтвердить заказ"}
        </button>
      </div>
    </form>
  );
}
