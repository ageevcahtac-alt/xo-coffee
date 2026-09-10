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
      <div className="px-4 py-16 text-center text-cream/70 sm:px-6 md:px-8">
        Загружаем ваш Coffee Passport…
      </div>
    );
  }

  if (state === "not-found") {
    return (
      <section className="px-4 py-10 sm:px-6 sm:py-14 md:px-8">
        <div className="mx-auto max-w-xl rounded-2xl border border-gold/20 bg-backdrop/35 p-8 text-center text-cream shadow-2xl backdrop-blur-[10px]">
          <h1 className="font-display text-2xl font-semibold">
            Не нашли этот Coffee Passport
          </h1>
          <p className="mt-4 leading-relaxed text-cream/75">
            Заказ №{orderNumber} не найден на этом устройстве. Coffee Passport
            хранится локально в браузере, где оформлялся заказ, — на другом
            устройстве или после очистки данных сайта он недоступен.
          </p>
          <Link
            href="/#catalog"
            className="mt-8 inline-flex h-12 items-center justify-center bg-gold px-8 text-sm font-semibold uppercase tracking-[0.15em] text-burgundy transition-all duration-300 hover:-translate-y-1 hover:bg-gold-dark"
          >
            Перейти в каталог
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-gold/20 bg-backdrop/35 p-5 text-cream shadow-2xl backdrop-blur-[10px] sm:p-8 md:rounded-3xl md:p-12">
        <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gold">
          Coffee Passport
        </span>
        <h1 className="mt-4 font-display text-3xl font-semibold sm:text-4xl">
          Заказ №{orderNumber}
        </h1>
        <p className="mt-3 max-w-xl leading-relaxed text-cream/70">
          Выберите способ приготовления, попробуйте чашку и сохраните
          впечатление — своими словами, без официальных терминов.
        </p>

        {resolvedLots.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-gold/30 bg-cream/85 px-6 py-10 text-center text-charcoal">
            <p className="font-display text-lg font-semibold text-burgundy">
              Лоты этого заказа больше не найдены в каталоге
            </p>
            <p className="mt-2 text-sm text-charcoal/60">
              В заказе были: {order?.items.map((item) => item.name).join(", ")}
            </p>
          </div>
        ) : (
          <>
            {resolvedItems.length > 1 && (
              <div className="mt-8">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
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
                          ? "cursor-not-allowed border-white/10 bg-white/5 text-cream/30"
                          : selectedLotId === lot.id
                            ? "tab-active-glow border-gold"
                            : "border-white/15 bg-white/15 text-cream/80 hover:border-gold/50 hover:bg-white/20 hover:text-gold"
                      }`}
                    >
                      {item.name}
                      {!lot ? " · недоступен" : ""}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 rounded-2xl bg-cream p-5 text-charcoal sm:p-7">
              {selectedLot ? (
                <CoffeePassportDetail
                  key={selectedLot.id}
                  lot={selectedLot}
                  orderNumber={orderNumber}
                  onOpenLotPassport={() => openLotPassportFor(selectedLot.id)}
                />
              ) : (
                <p className="text-sm text-charcoal/60">
                  Выберите лот из заказа выше.
                </p>
              )}
            </div>
          </>
        )}

        <div className="mt-8 flex flex-wrap gap-3 border-t border-cream/10 pt-6">
          <Link
            href="/passport"
            className="flex h-11 items-center justify-center border border-gold/50 px-5 text-xs font-semibold uppercase tracking-[0.1em] text-gold transition-all active:scale-95 hover:bg-gold hover:text-burgundy"
          >
            Мой кофе
          </Link>
          <Link
            href="/#catalog"
            className="flex h-11 items-center justify-center border border-cream/30 px-5 text-xs font-semibold uppercase tracking-[0.1em] text-cream transition-all active:scale-95 hover:border-gold hover:text-gold"
          >
            В каталог
          </Link>
          <button
            type="button"
            onClick={openDiscovery}
            className="flex h-11 items-center justify-center border border-cream/30 px-5 text-xs font-semibold uppercase tracking-[0.1em] text-cream transition-all active:scale-95 hover:border-gold hover:text-gold"
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
