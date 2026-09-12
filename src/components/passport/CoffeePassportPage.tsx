"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import LotPassportModal from "@/src/components/LotPassportModal";
import CoffeePassportDetail from "@/src/components/passport/CoffeePassportDetail";
import { useDiscovery } from "@/src/context/DiscoveryContext";
import { getOrderRecord } from "@/src/lib/coffeePassport";
import { LOTS } from "@/src/data/lots";
import type { OrderRecord } from "@/src/types/coffeePassport";
import type { Lot } from "@/src/types/lot";

type LoadState = "loading" | "not-found" | "ready";

export default function CoffeePassportPage({ orderNumber }: { orderNumber: string }) {
  const { openDiscovery } = useDiscovery();
  const [state, setState] = useState<LoadState>("loading");
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [lotPassportIndex, setLotPassportIndex] = useState<number | null>(null);

  // Orders live only in this browser's localStorage — read after mount to
  // avoid a server/client hydration mismatch (same pattern as CartContext).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const found = getOrderRecord(orderNumber);
    if (!found) {
      setState("not-found");
      return;
    }
    setOrder(found);
    const firstResolvable = found.items.find((item) =>
      LOTS.some((lot) => lot.id === item.lotId),
    );
    setSelectedLotId(firstResolvable?.lotId ?? null);
    setState("ready");
  }, [orderNumber]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const resolvedItems = useMemo(() => {
    if (!order) return [];
    return order.items.map((item) => ({
      item,
      lot: LOTS.find((lot) => lot.id === item.lotId) ?? null,
    }));
  }, [order]);

  const resolvedLots = useMemo(
    () => resolvedItems.map(({ lot }) => lot).filter((lot): lot is Lot => lot !== null),
    [resolvedItems],
  );

  const selectedLot = resolvedLots.find((lot) => lot.id === selectedLotId) ?? null;

  const openLotPassportFor = (lotId: string) => {
    const index = resolvedLots.findIndex((lot) => lot.id === lotId);
    if (index !== -1) setLotPassportIndex(index);
  };

  if (state === "loading") {
    return (
      <div className="px-4 py-16 text-center text-text/70 sm:px-6 md:px-8">
        Загружаем ваш Coffee Passport…
      </div>
    );
  }

  if (state === "not-found") {
    return (
      <section className="px-4 py-10 sm:px-6 sm:py-14 md:px-8">
        <div className="mx-auto max-w-xl rounded-2xl border border-border bg-surface p-8 text-center text-text shadow-2xl">
          <h1 className="font-display text-2xl font-semibold text-burgundy">
            Не нашли этот Coffee Passport
          </h1>
          <p className="mt-4 leading-relaxed text-text/70">
            Заказ №{orderNumber} не найден на этом устройстве. Coffee Passport
            хранится локально в браузере, где оформлялся заказ, — на другом
            устройстве или после очистки данных сайта он недоступен.
          </p>
          <Link
            href="/#catalog"
            className="mt-8 inline-flex h-12 items-center justify-center bg-accent px-8 text-sm font-semibold uppercase tracking-[0.15em] text-cream transition-all duration-300 hover:-translate-y-1 hover:bg-accent-hover"
          >
            Перейти в каталог
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-border bg-surface p-5 text-text shadow-2xl sm:p-8 md:rounded-3xl md:p-12">
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-dark">
          Coffee Passport
        </span>
        <h1 className="mt-4 font-display text-3xl font-semibold text-burgundy sm:text-4xl">
          Заказ №{orderNumber}
        </h1>
        <p className="mt-3 max-w-xl leading-relaxed text-text/70">
          Выберите способ приготовления, попробуйте чашку и сохраните
          впечатление — своими словами, без официальных терминов.
        </p>

        {resolvedLots.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-border bg-cream-dark px-6 py-10 text-center text-text">
            <p className="font-display text-lg font-semibold text-burgundy">
              Лоты этого заказа больше не найдены в каталоге
            </p>
            <p className="mt-2 text-sm text-text/60">
              В заказе были: {order?.items.map((item) => item.name).join(", ")}
            </p>
          </div>
        ) : (
          <>
            {resolvedItems.length > 1 && (
              <div className="mt-8">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">
                  Какой кофе сейчас пробуете?
                </span>
                <div className="mt-3 flex flex-wrap gap-2">
                  {resolvedItems.map(({ item, lot }) => (
                    <button
                      key={item.lotId}
                      type="button"
                      disabled={!lot}
                      aria-pressed={lot ? selectedLotId === lot.id : undefined}
                      onClick={() => lot && setSelectedLotId(lot.id)}
                      title={lot ? undefined : "Этот лот больше не в каталоге"}
                      className={`min-h-11 border px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] transition-all active:scale-95 ${
                        !lot
                          ? "cursor-not-allowed border-border bg-cream-dark text-text/30"
                          : selectedLotId === lot.id
                            ? "tab-active"
                            : "border-border bg-cream-dark text-text/70 hover:border-accent/40 hover:bg-accent-surface hover:text-burgundy"
                      }`}
                    >
                      {item.name}
                      {!lot ? " · недоступен" : ""}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 rounded-2xl border border-border bg-cream-dark/60 p-5 text-text sm:p-7">
              {selectedLot ? (
                <CoffeePassportDetail
                  key={selectedLot.id}
                  lot={selectedLot}
                  orderNumber={orderNumber}
                  onOpenLotPassport={() => openLotPassportFor(selectedLot.id)}
                />
              ) : (
                <p className="text-sm text-text/60">
                  Выберите лот из заказа выше.
                </p>
              )}
            </div>
          </>
        )}

        <div className="mt-8 flex flex-wrap gap-3 border-t border-border pt-6">
          <Link
            href="/passport"
            className="flex h-11 items-center justify-center border border-border px-5 text-xs font-semibold uppercase tracking-[0.1em] text-burgundy transition-all active:scale-95 hover:border-accent hover:bg-accent-surface"
          >
            Мой кофе
          </Link>
          <Link
            href="/#catalog"
            className="flex h-11 items-center justify-center border border-border px-5 text-xs font-semibold uppercase tracking-[0.1em] text-text/70 transition-all active:scale-95 hover:border-accent hover:text-burgundy"
          >
            В каталог
          </Link>
          <button
            type="button"
            onClick={openDiscovery}
            className="flex h-11 items-center justify-center border border-border px-5 text-xs font-semibold uppercase tracking-[0.1em] text-text/70 transition-all active:scale-95 hover:border-accent hover:text-burgundy"
          >
            Подобрать следующий кофе
          </button>
        </div>
      </div>

      <LotPassportModal
        lot={lotPassportIndex !== null ? (resolvedLots[lotPassportIndex] ?? null) : null}
        isOpen={lotPassportIndex !== null}
        onClose={() => setLotPassportIndex(null)}
        onPrev={() =>
          setLotPassportIndex((current) =>
            current === null || resolvedLots.length === 0
              ? current
              : (current - 1 + resolvedLots.length) % resolvedLots.length,
          )
        }
        onNext={() =>
          setLotPassportIndex((current) =>
            current === null || resolvedLots.length === 0
              ? current
              : (current + 1) % resolvedLots.length,
          )
        }
        hasMultiple={resolvedLots.length > 1}
        position={
          lotPassportIndex !== null
            ? { index: lotPassportIndex, total: resolvedLots.length }
            : null
        }
      />
    </section>
  );
}
