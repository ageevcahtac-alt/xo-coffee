"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import Link from "next/link";
import LotPassportModal from "@/src/components/LotPassportModal";
import { useCart } from "@/src/context/CartContext";
import { useDiscovery } from "@/src/context/DiscoveryContext";
import { useCatalog } from "@/src/context/CatalogContext";
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
  const { lots: LOTS } = useCatalog();
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
    [LOTS, tastings],
  );

  const recommendations: DiscoveryResult[] = useMemo(
    () => (hydrated ? getPersonalRecommendations(LOTS, context) : []),
    [hydrated, context, LOTS],
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
    [context, LOTS],
  );

  const passportLot = passportLotId ? (LOTS.find((lot) => lot.id === passportLotId) ?? null) : null;

  const handleAdd = (event: MouseEvent<HTMLButtonElement>, lot: Lot) => {
    flyToCart(event.currentTarget.getBoundingClientRect());
    addItem({ id: lot.id, name: lot.name, country: lot.country, price: lot.price });
  };

  const brewHabit = getBrewHabitSummary(context);

  return (
    <section className="px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-border bg-surface p-5 text-text shadow-sm sm:p-8 md:rounded-3xl md:p-12">
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-dark">
          Мой кофе
        </span>
        <h1 className="mt-4 font-display text-3xl font-semibold text-burgundy sm:text-4xl">
          Мы помним, что вы уже пробовали
        </h1>
        <p className="mt-3 max-w-xl leading-relaxed text-text/70">
          {getTasteSummary(context)}
        </p>
        {brewHabit && <p className="mt-1 text-sm text-text/60">{brewHabit}</p>}
        <p className="mt-3 text-xs text-text/65">
          История дегустаций хранится локально, в этом браузере — без аккаунта
          и синхронизации между устройствами.
        </p>

        {context.tastingCount > 0 && (
          <div className="mt-6 flex flex-wrap gap-6 text-sm text-text/70">
            <span>
              <strong className="font-display text-xl text-burgundy">
                {context.distinctLotsCount}
              </strong>{" "}
              {context.distinctLotsCount === 1 ? "лот попробован" : "лотов попробовано"}
            </span>
            <span>
              <strong className="font-display text-xl text-burgundy">
                {context.tastingCount}
              </strong>{" "}
              {context.tastingCount === 1 ? "дегустация" : "дегустаций"}
            </span>
          </div>
        )}

        {/* Personal recommendations — a thin layer over the existing Discovery engine */}
        {hydrated && recommendations.length > 0 && (
          <div className="mt-10">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">
              Попробовать дальше
            </span>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recommendations.map((result) => {
                const brewHighlight = getBrewHighlight(result.lot);
                return (
                  <div
                    key={result.lot.id}
                    className="flex flex-col rounded-xl border border-border bg-cream-dark/60 p-5 text-text"
                  >
                    <h3 className="font-display text-lg font-semibold text-burgundy">
                      {result.lot.country || result.lot.name}
                    </h3>
                    <p className="text-xs uppercase tracking-[0.08em] text-burgundy/65">
                      {result.lot.region}
                    </p>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-burgundy/80">
                      {result.reason}
                    </p>
                    {brewHighlight && (
                      <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.06em] text-burgundy/65">
                        {brewHighlight.label} · {brewHighlight.spec.ratio}, {brewHighlight.spec.tempC}°C
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-3">
                      <span className="shrink-0 whitespace-nowrap font-display text-base font-semibold text-burgundy">
                        {formatPrice(result.lot.price)}
                      </span>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={(event) => handleAdd(event, result.lot)}
                          className="flex h-10 items-center justify-center whitespace-nowrap bg-accent px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-cream transition-all active:scale-95 hover:bg-accent-hover"
                        >
                          В корзину
                        </button>
                        <button
                          type="button"
                          onClick={() => setPassportLotId(result.lot.id)}
                          className="flex h-10 items-center justify-center whitespace-nowrap border border-border px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-burgundy transition-all active:scale-95 hover:border-accent hover:bg-accent-surface"
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
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">
              Лоты, которые вы пробовали
            </span>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {tastedLots.map(({ lot, count, liked, disliked }) => (
                <button
                  key={lot.id}
                  type="button"
                  onClick={() => setPassportLotId(lot.id)}
                  className="flex items-center justify-between gap-3 border border-border bg-cream-dark/60 px-4 py-3 text-left transition-all active:scale-[0.99] hover:border-accent/40 hover:bg-cream-dark"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-display text-base font-semibold text-burgundy">
                      {lot.country || lot.name}
                    </span>
                    <span className="block text-xs uppercase tracking-[0.08em] text-text/65">
                      {lot.region ? `${lot.region} · ` : ""}{count === 1 ? "1 дегустация" : `${count} дегустаций`}
                    </span>
                  </span>
                  {liked && (
                    <span className="shrink-0 border border-gold/50 bg-gold/15 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-gold-dark">
                      Понравилось
                    </span>
                  )}
                  {!liked && disliked && (
                    <span className="shrink-0 border border-border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-text/65">
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
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">
              Последние дегустации
            </span>
            <div className="mt-4 space-y-3">
              {context.recentTastings.map((record) => {
                const lot = LOTS.find((candidate) => candidate.id === record.lotId);
                return (
                  <div
                    key={record.id}
                    className="border border-border bg-cream-dark/60 p-4 text-sm text-text/75"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-display text-base font-semibold text-burgundy">
                        {lot ? lot.country || lot.name : "Лот больше не в каталоге"}
                        {record.component ? ` · ${record.component}` : ""}
                      </span>
                      <span className="text-xs uppercase tracking-[0.08em] text-text/65">
                        {formatTastingDate(record.createdAt)} ·{" "}
                        {BREW_METHOD_LABELS[record.brewMethod] ?? record.brewMethod}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-text/60">
                      Кислотность {record.rating.acidity} · Сладость {record.rating.sweetness} ·
                      Тело {record.rating.body} · Понравилось {record.rating.overall}/5
                    </p>
                    {record.note && (
                      <p className="mt-2 leading-relaxed text-text/75">«{record.note}»</p>
                    )}
                    <Link
                      href={`/passport/${record.orderNumber}`}
                      className="mt-2 inline-block text-xs font-semibold uppercase tracking-[0.08em] text-burgundy transition-colors hover:text-gold-dark"
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
          <div className="mt-10 rounded-xl border border-dashed border-border bg-cream-dark/60 px-6 py-10 text-center">
            <p className="font-display text-lg font-semibold text-burgundy">
              Пока здесь пусто
            </p>
            <p className="mt-2 text-sm text-text/60">
              Купите лот и откройте его Coffee Passport, чтобы сохранить первое впечатление.
            </p>
          </div>
        )}

        <div className="mt-10 flex flex-wrap gap-3 border-t border-border pt-6">
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
        onSelectLot={setPassportLotId}
        hasMultiple={false}
        position={null}
      />
    </section>
  );
}
