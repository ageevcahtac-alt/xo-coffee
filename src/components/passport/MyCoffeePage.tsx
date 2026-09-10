"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import Link from "next/link";
import LotPassportModal from "@/src/components/LotPassportModal";
import { useCart } from "@/src/context/CartContext";
import { useDiscovery } from "@/src/context/DiscoveryContext";
import { LOTS } from "@/src/data/lots";
import { formatPrice } from "@/src/lib/format";
import { getBrewHighlight } from "@/src/lib/lotPresentation";
import { getAllTastingRecords, getTastingRecordsForLot } from "@/src/lib/coffeePassport";
import {
  buildPersonalTasteContext,
  getBrewHabitSummary,
  getPersonalRecommendations,
  getTasteSummary,
  type PersonalTasteContext,
} from "@/src/lib/personalTaste";
import type { DiscoveryResult } from "@/src/lib/discovery";
import type { TastingRecord } from "@/src/types/coffeePassport";
import type { Lot } from "@/src/types/lot";

const BREW_METHOD_LABELS: Record<string, string> = {
  v60: "V60",
  immersion: "Иммерсия / батч",
  espresso: "Эспрессо",
  other: "Свой способ",
};

function formatTastingDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function MyCoffeePage() {
  const { addItem, flyToCart } = useCart();
  const { openDiscovery } = useDiscovery();
  const [hydrated, setHydrated] = useState(false);
  const [tastings, setTastings] = useState<TastingRecord[]>([]);
  const [passportLotId, setPassportLotId] = useState<string | null>(null);

  // Tasting history lives only in this browser's localStorage — read after
  // mount to avoid a server/client hydration mismatch (same pattern as
  // CartContext and the rest of Coffee Passport).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setTastings(getAllTastingRecords());
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const context: PersonalTasteContext = useMemo(
    () => buildPersonalTasteContext(LOTS, tastings),
    [tastings],
  );

  const recommendations: DiscoveryResult[] = useMemo(
    () => (hydrated ? getPersonalRecommendations(LOTS, context) : []),
    [hydrated, context],
  );

  const tastedLots = useMemo(
    () =>
      context.tastedLotIds
        .map((lotId) => LOTS.find((lot) => lot.id === lotId))
        .filter((lot): lot is Lot => lot !== undefined)
        .map((lot) => ({
          lot,
          count: getTastingRecordsForLot(lot.id).length,
          liked: context.likedLotIds.includes(lot.id),
          disliked: context.dislikedLotIds.includes(lot.id),
        })),
    [context],
  );

  const passportLot = passportLotId ? (LOTS.find((lot) => lot.id === passportLotId) ?? null) : null;

  const handleAdd = (event: MouseEvent<HTMLButtonElement>, lot: Lot) => {
    flyToCart(event.currentTarget.getBoundingClientRect());
    addItem({ id: lot.id, name: lot.name, country: lot.country, price: lot.price });
  };

  const brewHabit = getBrewHabitSummary(context);

  return (
    <section className="px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-gold/20 bg-backdrop/35 p-5 text-cream shadow-2xl backdrop-blur-[10px] sm:p-8 md:rounded-3xl md:p-12">
        <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gold">
          Мой кофе
        </span>
        <h1 className="mt-4 font-display text-3xl font-semibold sm:text-4xl">
          Мы помним, что вы уже пробовали
        </h1>
        <p className="mt-3 max-w-xl leading-relaxed text-cream/70">
          {getTasteSummary(context)}
        </p>
        {brewHabit && <p className="mt-1 text-sm text-cream/60">{brewHabit}</p>}
        <p className="mt-3 text-xs text-cream/40">
          История дегустаций хранится локально, в этом браузере — без аккаунта
          и синхронизации между устройствами.
        </p>

        {context.tastingCount > 0 && (
          <div className="mt-6 flex flex-wrap gap-6 text-sm text-cream/70">
            <span>
              <strong className="font-display text-xl text-cream">
                {context.distinctLotsCount}
              </strong>{" "}
              {context.distinctLotsCount === 1 ? "лот попробован" : "лотов попробовано"}
            </span>
            <span>
              <strong className="font-display text-xl text-cream">
                {context.tastingCount}
              </strong>{" "}
              {context.tastingCount === 1 ? "дегустация" : "дегустаций"}
            </span>
          </div>
        )}

        {/* Personal recommendations — a thin layer over the existing Discovery engine */}
        {hydrated && recommendations.length > 0 && (
          <div className="mt-10">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
              Попробовать дальше
            </span>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recommendations.map((result) => {
                const brewHighlight = getBrewHighlight(result.lot);
                return (
                  <div
                    key={result.lot.id}
                    className="flex flex-col rounded-xl border border-gold/30 bg-cream/90 p-5 text-charcoal"
                  >
                    <h3 className="font-display text-lg font-semibold text-burgundy">
                      {result.lot.country}
                    </h3>
                    <p className="text-xs uppercase tracking-[0.08em] text-burgundy/60">
                      {result.lot.region}
                    </p>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-burgundy/80">
                      {result.reason}
                    </p>
                    {brewHighlight && (
                      <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.06em] text-burgundy/55">
                        {brewHighlight.label} · {brewHighlight.spec.ratio}, {brewHighlight.spec.tempC}°C
                      </p>
                    )}
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="font-display text-base font-semibold text-burgundy">
                        {formatPrice(result.lot.price)}
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={(event) => handleAdd(event, result.lot)}
                          className="flex h-10 items-center justify-center border border-gold/40 bg-burgundy px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-cream transition-all active:scale-95 hover:bg-burgundy-dark"
                        >
                          В корзину
                        </button>
                        <button
                          type="button"
                          onClick={() => setPassportLotId(result.lot.id)}
                          className="flex h-10 items-center justify-center border border-burgundy/30 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-burgundy transition-all active:scale-95 hover:bg-burgundy/10"
                        >
                          Паспорт
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* My lots — which ones, liked/disliked, how many times */}
        {hydrated && tastedLots.length > 0 && (
          <div className="mt-10">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
              Лоты, которые вы пробовали
            </span>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {tastedLots.map(({ lot, count, liked, disliked }) => (
                <button
                  key={lot.id}
                  type="button"
                  onClick={() => setPassportLotId(lot.id)}
                  className="flex items-center justify-between gap-3 border border-white/15 bg-white/10 px-4 py-3 text-left transition-all active:scale-[0.99] hover:border-gold/50 hover:bg-white/15"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-display text-base font-semibold text-cream">
                      {lot.country}
                    </span>
                    <span className="block text-xs uppercase tracking-[0.08em] text-cream/50">
                      {lot.region} · {count === 1 ? "1 дегустация" : `${count} дегустаций`}
                    </span>
                  </span>
                  {liked && (
                    <span className="shrink-0 border border-gold/50 bg-gold/15 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-gold">
                      Понравилось
                    </span>
                  )}
                  {!liked && disliked && (
                    <span className="shrink-0 border border-cream/20 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-cream/50">
                      Не ваше
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent tastings — chronological detail: date, brew, ratings, note */}
        {hydrated && context.recentTastings.length > 0 && (
          <div className="mt-10">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
              Последние дегустации
            </span>
            <div className="mt-4 space-y-3">
              {context.recentTastings.map((record) => {
                const lot = LOTS.find((candidate) => candidate.id === record.lotId);
                return (
                  <div
                    key={record.id}
                    className="border border-white/15 bg-white/10 p-4 text-sm text-cream/80"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-display text-base font-semibold text-cream">
                        {lot ? lot.country : "Лот больше не в каталоге"}
                        {record.component ? ` · ${record.component}` : ""}
                      </span>
                      <span className="text-xs uppercase tracking-[0.08em] text-cream/50">
                        {formatTastingDate(record.createdAt)} ·{" "}
                        {BREW_METHOD_LABELS[record.brewMethod] ?? record.brewMethod}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-cream/60">
                      Кислотность {record.rating.acidity} · Сладость {record.rating.sweetness} ·
                      Тело {record.rating.body} · Понравилось {record.rating.overall}/5
                    </p>
                    {record.note && (
                      <p className="mt-2 leading-relaxed text-cream/75">«{record.note}»</p>
                    )}
                    <Link
                      href={`/passport/${record.orderNumber}`}
                      className="mt-2 inline-block text-xs font-semibold uppercase tracking-[0.08em] text-gold transition-colors hover:text-gold-dark"
                    >
                      Открыть Coffee Passport заказа №{record.orderNumber}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {hydrated && context.tastingCount === 0 && (
          <div className="mt-10 rounded-xl border border-dashed border-gold/30 bg-cream/10 px-6 py-10 text-center">
            <p className="font-display text-lg font-semibold text-cream">
              Пока здесь пусто
            </p>
            <p className="mt-2 text-sm text-cream/60">
              Купите лот и откройте его Coffee Passport, чтобы сохранить первое впечатление.
            </p>
          </div>
        )}

        <div className="mt-10 flex flex-wrap gap-3 border-t border-cream/10 pt-6">
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
            Подобрать кофе
          </button>
        </div>
      </div>

      <LotPassportModal
        lot={passportLot}
        isOpen={passportLot !== null}
        onClose={() => setPassportLotId(null)}
        onPrev={() => {}}
        onNext={() => {}}
        hasMultiple={false}
        position={null}
      />
    </section>
  );
}
