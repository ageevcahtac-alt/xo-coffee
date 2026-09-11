"use client";

import { useEffect, useState, type KeyboardEvent, type MouseEvent } from "react";
import { useCart } from "@/src/context/CartContext";
import { formatPrice } from "@/src/lib/format";
import { useCrossfadeTransition } from "@/src/hooks/useCrossfadeTransition";
import LotPassportModal from "@/src/components/LotPassportModal";
import {
  REGION_COUNTRIES,
  TOP_CATEGORIES,
  type RegionCountry,
  type TopCategoryId,
} from "@/src/data/categories";
import { LOTS } from "@/src/data/lots";
import type { Lot } from "@/src/types/lot";
import {
  getBrewHighlight,
  getWhoLikesIt,
  isEntryProduct,
} from "@/src/lib/lotPresentation";
import { useDiscovery } from "@/src/context/DiscoveryContext";
import {
  FLAVOR_DIRECTIONS,
  FLAVOR_DIRECTION_PROFILES,
  getBestFlavorDirection,
  rankLotsByFlavorDirection,
  type FlavorDirection,
} from "@/src/lib/flavorMatch";
import { getLikedDislikedLotIds } from "@/src/lib/coffeePassport";

export default function Catalog() {
  const { addItem, flyToCart } = useCart();
  const { openDiscovery } = useDiscovery();
  const [activeSection, setActiveSection] = useState<TopCategoryId>("all");
  const [activeCountry, setActiveCountry] = useState<RegionCountry | null>(
    null,
  );
  const [activeFlavor, setActiveFlavor] = useState<FlavorDirection | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const gridTransition = useCrossfadeTransition(300);
  const lotTransition = useCrossfadeTransition(300);

  const selectSection = (id: TopCategoryId) => {
    if (id === activeSection) return;
    gridTransition.runTransition(() => {
      setActiveSection(id);
      if (id !== "region") setActiveCountry(null);
    });
  };

  const selectCountry = (country: RegionCountry) => {
    gridTransition.runTransition(() => {
      setActiveCountry((prev) => (prev === country ? null : country));
    });
  };

  // Flavor exploration re-ranks whatever the category tabs already show —
  // it never hides a lot, only reorders. Toggling the same chip again (or
  // "Все") clears it. This only ever runs from a click, well after
  // hydration, so reading tasting history directly here (no effect) can't
  // cause a server/client mismatch.
  const selectFlavor = (direction: FlavorDirection) => {
    gridTransition.runTransition(() => {
      setActiveFlavor((prev) => (prev === direction ? null : direction));
    });
  };

  const regionLots = LOTS.filter((lot) =>
    REGION_COUNTRIES.includes(lot.country as RegionCountry),
  );

  const visibleLots =
    activeSection === "all"
      ? LOTS
      : activeSection === "specialty-set"
        ? LOTS.filter((lot) => lot.category === "specialty-set")
        : activeSection === "region"
          ? activeCountry
            ? regionLots.filter((lot) => lot.country === activeCountry)
            : regionLots
          : [];

  const orderedLots = activeFlavor
    ? rankLotsByFlavorDirection(visibleLots, activeFlavor, getLikedDislikedLotIds())
    : visibleLots;

  // Only the first entry-product card gets the #degustation anchor id, so
  // adding a second specialty-set lot later can't create a duplicate DOM id.
  const firstEntryLotId = LOTS.find((lot) => isEntryProduct(lot))?.id ?? null;

  // Keep activeIndex alive through the closing animation (Modal fades out
  // over ~400ms) so the displayed lot doesn't disappear mid-transition.
  useEffect(() => {
    if (!modalOpen) {
      const timeout = setTimeout(() => setActiveIndex(null), 400);
      return () => clearTimeout(timeout);
    }
  }, [modalOpen]);

  const displayLot = activeIndex !== null ? (orderedLots[activeIndex] ?? null) : null;

  const openLot = (lot: Lot) => {
    const index = orderedLots.findIndex((l) => l.id === lot.id);
    setActiveIndex(index === -1 ? 0 : index);
    setModalOpen(true);
  };

  const goToPrevLot = () => {
    lotTransition.runTransition(() => {
      setActiveIndex((index) => {
        if (index === null || orderedLots.length === 0) return index;
        return (index - 1 + orderedLots.length) % orderedLots.length;
      });
    });
  };

  const goToNextLot = () => {
    lotTransition.runTransition(() => {
      setActiveIndex((index) => {
        if (index === null || orderedLots.length === 0) return index;
        return (index + 1) % orderedLots.length;
      });
    });
  };

  // A similar-lot pick from inside the Passport may not belong to the
  // currently active category/region — fall back to "Все" so it's always
  // reachable, then open it there.
  const selectLotById = (lotId: string) => {
    const indexInOrdered = orderedLots.findIndex((l) => l.id === lotId);
    if (indexInOrdered !== -1) {
      lotTransition.runTransition(() => setActiveIndex(indexInOrdered));
      return;
    }
    gridTransition.runTransition(() => {
      setActiveSection("all");
      setActiveCountry(null);
      setActiveFlavor(null);
    });
    const indexInAll = LOTS.findIndex((l) => l.id === lotId);
    lotTransition.runTransition(() => setActiveIndex(indexInAll === -1 ? null : indexInAll));
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>, lot: Lot) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openLot(lot);
    }
  };

  const handleAddToCart = (event: MouseEvent<HTMLButtonElement>, lot: Lot) => {
    event.stopPropagation();
    flyToCart(event.currentTarget.getBoundingClientRect());
    addItem({
      id: lot.id,
      name: lot.name,
      country: lot.country,
      price: lot.price,
    });
  };

  return (
    <section id="catalog" className="px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-2xl border border-gold/20 bg-backdrop/35 p-5 shadow-2xl backdrop-blur-[10px] sm:p-8 md:rounded-3xl md:p-12 lg:p-16">
        <div className="mb-8 max-w-2xl sm:mb-10">
          <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gold">
            Каталог
          </span>
          <h2 className="mt-4 font-display text-3xl font-semibold text-cream sm:text-4xl md:text-5xl">
            Лоты с паспортом зерна
          </h2>
          <p className="mt-4 leading-relaxed text-cream/70">
            Нажмите на лот, чтобы открыть полный паспорт: происхождение,
            сенсорный профиль и рекомендации по завариванию.
          </p>
        </div>

        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border border-gold/25 bg-cream/10 px-5 py-4 sm:mb-10">
          <p className="text-sm text-cream/80">
            Не знаете, что выбрать?{" "}
            <span className="text-cream/60">Подберём за 1 минуту.</span>
          </p>
          <button
            type="button"
            onClick={openDiscovery}
            className="flex h-11 shrink-0 items-center justify-center border border-gold/50 px-5 text-xs font-semibold uppercase tracking-[0.1em] text-gold transition-all active:scale-95 hover:bg-gold hover:text-burgundy"
          >
            Подобрать кофе
          </button>
        </div>

        <div className="mb-8 sm:mb-10">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            Какой характер кофе вы ищете?
          </span>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={activeFlavor === null}
              onClick={() => setActiveFlavor(null)}
              className={`min-h-11 border px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] backdrop-blur-md transition-all duration-150 active:scale-95 ${
                activeFlavor === null
                  ? "tab-active-glow border-gold"
                  : "border-white/15 bg-white/15 text-cream/80 hover:border-gold/50 hover:bg-white/20 hover:text-gold"
              }`}
            >
              Все характеры
            </button>
            {FLAVOR_DIRECTIONS.map((direction) => (
              <button
                key={direction}
                type="button"
                aria-pressed={activeFlavor === direction}
                onClick={() => selectFlavor(direction)}
                className={`min-h-11 border px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] backdrop-blur-md transition-all duration-150 active:scale-95 ${
                  activeFlavor === direction
                    ? "tab-active-glow border-gold"
                    : "border-white/15 bg-white/15 text-cream/80 hover:border-gold/50 hover:bg-white/20 hover:text-gold"
                }`}
              >
                {FLAVOR_DIRECTION_PROFILES[direction].label}
              </button>
            ))}
          </div>
          {activeFlavor && (
            <p className="mt-3 text-xs text-cream/60">
              Каталог ниже отсортирован по близости к «
              {FLAVOR_DIRECTION_PROFILES[activeFlavor].label}» — остальные лоты никуда
              не делись, просто ниже в списке.
            </p>
          )}
        </div>

        <div className="mb-8 sm:mb-12">
          <div className="flex flex-wrap gap-2">
            {TOP_CATEGORIES.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => selectSection(category.id)}
                className={`min-h-11 border px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] backdrop-blur-md transition-all duration-150 active:scale-95 ${
                  activeSection === category.id
                    ? "tab-active-glow border-gold"
                    : "border-white/15 bg-white/15 text-cream/80 hover:border-gold/50 hover:bg-white/20 hover:text-gold"
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>

          {activeSection === "region" && (
            <div className="mt-4 flex flex-wrap gap-2 border-l-2 border-gold/50 pl-4">
              {REGION_COUNTRIES.map((country) => (
                <button
                  key={country}
                  type="button"
                  onClick={() => selectCountry(country)}
                  className={`min-h-11 border px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.08em] backdrop-blur-md transition-all duration-150 active:scale-95 ${
                    activeCountry === country
                      ? "tab-active-glow border-gold"
                      : "border-white/15 bg-white/15 text-cream/70 hover:border-gold/50 hover:bg-white/20 hover:text-gold"
                  }`}
                >
                  {country}
                </button>
              ))}
            </div>
          )}
        </div>

        <div
          className={`transition-all duration-300 ease-in-out ${gridTransition.className}`}
        >
          {orderedLots.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gold/30 bg-cream/85 px-8 py-16 text-center backdrop-blur-md">
              <p className="font-display text-xl font-semibold text-burgundy">
                Скоро в каталоге
              </p>
              <p className="mt-2 text-sm text-charcoal/60">
                Мы готовим эту витрину — загляните чуть позже.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
              {orderedLots.map((lot) => {
                const entry = isEntryProduct(lot);
                const brewHighlight = getBrewHighlight(lot);
                // Same "one lot, one blended profile can't honestly stand
                // in for a single character" reasoning as elsewhere — no
                // direction tag for the tasting set.
                const characterDirection = entry ? null : getBestFlavorDirection(lot);
                // Only join fields that actually exist — same rule as
                // CoffeePassportDetail's referenceParts, never render a
                // stray "· ·" or an "undefined" fragment for a partial lot.
                const specParts: string[] = [];
                if (typeof lot.altitudeMasl === "number" && Number.isFinite(lot.altitudeMasl)) {
                  specParts.push(`${lot.altitudeMasl} MASL`);
                }
                if (lot.process) specParts.push(lot.process);
                if (lot.variety) specParts.push(lot.variety);
                return (
                <article
                  key={lot.id}
                  id={lot.id === firstEntryLotId ? "degustation" : undefined}
                  role="button"
                  tabIndex={0}
                  onClick={() => openLot(lot)}
                  onKeyDown={(event) => handleCardKeyDown(event, lot)}
                  className="flex cursor-pointer scroll-mt-28 flex-col overflow-hidden rounded-xl border border-gold/30 bg-cream/85 backdrop-blur-md transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-2 hover:border-gold hover:shadow-xl active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between border-b border-burgundy/10 px-5 py-3">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-burgundy/70">
                      {lot.name}
                    </span>
                    <span className="border border-gold/40 bg-cream px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-burgundy">
                      Паспорт
                    </span>
                  </div>

                  <div className="flex-1 px-4 py-4 sm:px-5 sm:py-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-display text-xl font-semibold text-burgundy">
                          {lot.country}
                        </h3>
                        <p className="text-xs uppercase tracking-[0.1em] text-burgundy/70">
                          {lot.region}
                        </p>
                      </div>
                      {typeof lot.qScore === "number" && (
                        <span
                          aria-label={`Оценка Q-грейдера: ${lot.qScore} из 100`}
                          className="shrink-0 border border-gold/40 bg-cream px-2 py-0.5 text-[11px] font-bold text-burgundy"
                        >
                          {lot.qScore} Q
                        </span>
                      )}
                    </div>

                    {entry && (
                      <span className="mt-3 inline-flex items-center border border-gold bg-gold/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-gold-dark">
                        Точка входа · Попробовать несколько характеров
                      </span>
                    )}

                    {characterDirection && (
                      <span className="mt-3 block text-[11px] font-bold uppercase tracking-[0.08em] text-gold-dark">
                        {FLAVOR_DIRECTION_PROFILES[characterDirection].label}
                      </span>
                    )}

                    {lot.cupNote && (
                      <p className="mt-3 font-display text-base italic leading-snug text-burgundy line-clamp-3">
                        «{lot.cupNote}»
                      </p>
                    )}

                    <p className="mt-3 text-xs leading-relaxed text-burgundy/75 line-clamp-2">
                      {getWhoLikesIt(
                        lot,
                        characterDirection
                          ? FLAVOR_DIRECTION_PROFILES[characterDirection].reason
                          : null,
                      )}
                    </p>

                    {brewHighlight && (
                      <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.06em] text-burgundy/60">
                        Как готовить: {brewHighlight.label} · {brewHighlight.spec.ratio}, {brewHighlight.spec.tempC}°C
                      </p>
                    )}

                    {specParts.length > 0 && (
                      <p className="mt-3 line-clamp-1 border-t border-burgundy/10 pt-3 text-[10px] uppercase tracking-[0.06em] text-burgundy/45">
                        {specParts.join(" · ")}
                      </p>
                    )}

                    <p className="mt-1.5 text-[10px] uppercase tracking-[0.06em] text-burgundy/45">
                      Только цельное зерно
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-burgundy/10 px-4 py-3 sm:px-5 sm:py-4">
                    <span className="font-display text-lg font-semibold text-burgundy">
                      {formatPrice(lot.price)}
                    </span>
                    <button
                      type="button"
                      onClick={(event) => handleAddToCart(event, lot)}
                      className="flex h-11 items-center justify-center border border-gold/40 bg-burgundy px-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-cream transition-all active:scale-95 hover:bg-burgundy-dark"
                    >
                      В корзину
                    </button>
                  </div>
                </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <LotPassportModal
        lot={displayLot}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onPrev={goToPrevLot}
        onNext={goToNextLot}
        onSelectLot={selectLotById}
        hasMultiple={orderedLots.length > 1}
        position={
          activeIndex !== null
            ? { index: activeIndex, total: orderedLots.length }
            : null
        }
        transitionClassName={lotTransition.className}
      />
    </section>
  );
}
