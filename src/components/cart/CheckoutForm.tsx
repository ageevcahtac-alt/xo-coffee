"use client";

import { useState, type ChangeEvent, type FocusEvent, type FormEvent } from "react";
import { useCart } from "@/src/context/CartContext";
import { formatPrice } from "@/src/lib/format";
import { getDeliveryFee } from "@/src/lib/shop";
import FreeShippingBar from "@/src/components/cart/FreeShippingBar";
import SegmentedControl from "@/src/components/ui/SegmentedControl";
import type { FulfillmentMethod } from "@/src/types/order";

export type CarrierOption = "cdek-pvz" | "cdek-courier" | "yandex";

export type ContactInfo = {
  name: string;
  email: string;
  phone: string;
  fulfillment: FulfillmentMethod;
  carrier: CarrierOption;
  address: string;
};

export const CARRIER_LABELS: Record<CarrierOption, string> = {
  "cdek-pvz": "СДЭК · Пункт выдачи",
  "cdek-courier": "СДЭК · Курьер",
  yandex: "Яндекс Доставка · Курьер",
};

const FULFILLMENT_OPTIONS: { value: FulfillmentMethod; label: string }[] = [
  { value: "delivery", label: "🚚 Доставка" },
  { value: "pickup", label: "☕ Самовывоз" },
];

const CARRIER_OPTIONS: { value: CarrierOption; label: string }[] = [
  { value: "cdek-pvz", label: "СДЭК ПВЗ" },
  { value: "cdek-courier", label: "СДЭК Курьер" },
  { value: "yandex", label: "Яндекс" },
];

const ADDRESS_LABELS: Record<CarrierOption, string> = {
  "cdek-pvz": "Адрес пункта выдачи СДЭК",
  "cdek-courier": "Адрес доставки",
  yandex: "Адрес доставки",
};

const ADDRESS_PLACEHOLDERS: Record<CarrierOption, string> = {
  "cdek-pvz": "Город, ближайший пункт выдачи",
  "cdek-courier": "Город, улица, дом, квартира",
  yandex: "Город, улица, дом, квартира",
};

export const PICKUP_POINTS = ["г. Всеволожск, Коралловская ул., 16"];

/** Formats digits into "+7 (9XX) XXX-XX-XX", always keeping the +7 prefix. */
function formatPhone(raw: string) {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("8")) digits = `7${digits.slice(1)}`;
  if (digits.length > 0 && !digits.startsWith("7")) digits = `7${digits}`;
  digits = digits.slice(0, 11);

  const rest = digits.slice(1);
  let formatted = "+7 (";
  formatted += rest.slice(0, 3);
  if (rest.length >= 3) formatted += ") ";
  if (rest.length > 3) formatted += rest.slice(3, 6);
  if (rest.length > 6) formatted += `-${rest.slice(6, 8)}`;
  if (rest.length > 8) formatted += `-${rest.slice(8, 10)}`;
  return formatted;
}

export default function CheckoutForm({
  initialValues,
  onBack,
  onContinue,
}: {
  initialValues?: ContactInfo;
  onBack: () => void;
  onContinue: (info: ContactInfo) => void;
}) {
  const { items, totalPrice } = useCart();
  const [fulfillment, setFulfillment] = useState<FulfillmentMethod>(
    initialValues?.fulfillment ?? "delivery",
  );
  const [carrier, setCarrier] = useState<CarrierOption>(
    initialValues?.carrier ?? "cdek-pvz",
  );
  const [address, setAddress] = useState(
    initialValues?.fulfillment !== "pickup" ? (initialValues?.address ?? "") : "",
  );
  const [pickupPoint, setPickupPoint] = useState(
    initialValues?.fulfillment === "pickup"
      ? initialValues.address
      : PICKUP_POINTS[0],
  );
  const [phone, setPhone] = useState(initialValues?.phone ?? "");
  const [phoneError, setPhoneError] = useState(false);

  const deliveryFee =
    fulfillment === "pickup" ? 0 : getDeliveryFee(totalPrice);
  const grandTotal = totalPrice + deliveryFee;

  const handlePhoneFocus = (event: FocusEvent<HTMLInputElement>) => {
    if (!event.target.value) setPhone(formatPhone(""));
  };

  const handlePhoneChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(event.target.value));
    setPhoneError(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length !== 11) {
      setPhoneError(true);
      return;
    }

    const form = new FormData(event.currentTarget);
    onContinue({
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      phone,
      fulfillment,
      carrier,
      address: fulfillment === "pickup" ? pickupPoint : address,
    });
  };

  const inputClass =
    "w-full border border-charcoal/20 bg-cream-dark px-4 py-3 text-sm text-charcoal placeholder:text-charcoal/55 outline-none transition-colors focus:border-burgundy";

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-1 flex-col overflow-hidden"
    >
      <div className="flex-1 space-y-8 overflow-y-auto px-6 py-6">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/65 transition-transform active:scale-95 hover:text-burgundy"
        >
          ← Назад в корзину
        </button>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-dark">
            Контактные данные
          </h3>
          <div className="mt-4 space-y-3">
            <input
              required
              name="name"
              type="text"
              autoComplete="name"
              defaultValue={initialValues?.name}
              placeholder="Имя"
              aria-label="Имя"
              className={inputClass}
            />
            <div>
              <input
                required
                name="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={phone}
                onFocus={handlePhoneFocus}
                onChange={handlePhoneChange}
                placeholder="+7 (9XX) XXX-XX-XX"
                aria-label="Телефон"
                aria-invalid={phoneError ? true : undefined}
                aria-describedby={phoneError ? "phone-error" : undefined}
                maxLength={18}
                className={inputClass}
              />
              {phoneError && (
                <p id="phone-error" className="mt-1.5 text-xs text-error">
                  Введите номер полностью: +7 (9XX) XXX-XX-XX
                </p>
              )}
            </div>
            <input
              required
              name="email"
              type="email"
              autoComplete="email"
              defaultValue={initialValues?.email}
              placeholder="Email — для чека и трек-номера"
              aria-label="Email"
              className={inputClass}
            />
          </div>
        </section>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-dark">
            Получение заказа
          </h3>
          <div className="mt-4">
            <SegmentedControl
              options={FULFILLMENT_OPTIONS}
              value={fulfillment}
              onChange={setFulfillment}
            />
          </div>

          {fulfillment === "delivery" ? (
            <div key="delivery" className="animate-[fadeInUp_0.25s_ease-out]">
              <div className="mt-4">
                <SegmentedControl
                  options={CARRIER_OPTIONS}
                  value={carrier}
                  onChange={setCarrier}
                />
              </div>

              <div key={carrier} className="mt-3">
                <input
                  required
                  name="address"
                  type="text"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder={ADDRESS_PLACEHOLDERS[carrier]}
                  aria-label={ADDRESS_LABELS[carrier]}
                  className={inputClass}
                />
              </div>
            </div>
          ) : (
            <div key="pickup" className="mt-4 animate-[fadeInUp_0.25s_ease-out]">
              <label htmlFor="pickupPoint" className="mb-1.5 block text-xs text-charcoal/65">
                Точка самовывоза
              </label>
              <select
                required
                id="pickupPoint"
                name="pickupPoint"
                value={pickupPoint}
                onChange={(event) => setPickupPoint(event.target.value)}
                className={inputClass}
              >
                {PICKUP_POINTS.map((point) => (
                  <option key={point} value={point}>
                    {point}
                  </option>
                ))}
              </select>
            </div>
          )}
        </section>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-dark">
            Итого
          </h3>
          <ul className="mt-4 space-y-2 text-sm">
            {items.map((item) => (
              <li key={item.id} className="flex justify-between gap-4">
                <span className="text-charcoal/70">
                  {item.name} × {item.quantity}{" "}
                  <span className="text-charcoal/65">(цельное зерно)</span>
                </span>
                <span className="font-medium text-charcoal">
                  {formatPrice(item.price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 space-y-2 border-t border-charcoal/10 pt-4 text-sm">
            <div className="flex justify-between text-charcoal/70">
              <span>Товары</span>
              <span>{formatPrice(totalPrice)}</span>
            </div>
            <div className="flex justify-between text-charcoal/70">
              <span>Доставка</span>
              <span>
                {deliveryFee === 0 ? "Бесплатно" : formatPrice(deliveryFee)}
              </span>
            </div>
            <div className="flex justify-between border-t border-charcoal/10 pt-2 font-display text-lg font-semibold text-burgundy">
              <span>К оплате</span>
              <span>{formatPrice(grandTotal)}</span>
            </div>
          </div>

          {fulfillment === "delivery" && (
            <div className="mt-4">
              <FreeShippingBar subtotal={totalPrice} />
            </div>
          )}
        </section>
      </div>

      <div className="border-t border-charcoal/15 px-6 py-6">
        <button
          type="submit"
          className="flex h-14 w-full items-center justify-center bg-burgundy text-sm font-semibold uppercase tracking-[0.15em] text-cream transition-all active:scale-[0.98] hover:bg-burgundy-dark"
        >
          Далее: способ оплаты
        </button>
      </div>
    </form>
  );
}
