"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import LotPurchaseControls from "@/src/components/LotPurchaseControls";
import { useCrossfadeTransition } from "@/src/hooks/useCrossfadeTransition";
import LotPassportModal from "@/src/components/LotPassportModal";
import {
  REGION_COUNTRIES,
  TOP_CATEGORIES,
  type RegionCountry,
  type TopCategoryId,
} from "@/src/data/categories";
import { useCatalog } from "@/src/context/CatalogContext";
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
  const { lots, status: catalogStatus } = useCatalog();
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

  const regionLots = lots.filter((lot) =>
    REGION_COUNTRIES.includes(lot.country as RegionCountry),
  );

  const visibleLots =
    activeSection === "all"
      ? lots
      : activeSection === "specialty-set"
        ? lots.filter((lot) => lot.category === "specialty-set")
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
  const firstEntryLotId = lots.find((lot) => isEntryProduct(lot))?.id ?? null;

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
    const indexInAll = lots.findIndex((l) => l.id === lotId);
    lotTransition.runTransition(() => setActiveIndex(indexInAll === -1 ? null : indexInAll));
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>, lot: Lot) => {
    // Keydown bubbles from the nested "В корзину" button up to this
    // card-level listener independently of the button's own click — without
    // this guard, pressing Enter/Space while focused on that button both
    // activates it AND opens the Lot Passport modal. Ignore anything that
    // didn't originate on the card itself (event.currentTarget).
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openLot(lot);
    }
  };

  return (
    <section id="catalog" className="px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-8 md:rounded-3xl md:p-12 lg:p-16">
        <div className="mb-8 max-w-2xl sm:mb-10">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-dark">
            Каталог
          </span>
          <h2 className="mt-4 font-display text-3xl font-semibold text-burgundy sm:text-4xl md:text-5xl">
            Лоты с паспортом зерна
          </h2>
          <p className="mt-4 leading-relaxed text-text/70">
            Нажмите на лот, чтобы открыть полный паспорт: происхождение,
            сенсорный профиль и рекомендации по завариванию.
          </p>
        </div>

        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border border-border bg-cream-dark px-5 py-4 sm:mb-10">
          <p className="text-sm text-text/75">
            Не знаете, что выбрать?{" "}
            <span className="text-text/65">Подберём за 1 минуту.</span>
          </p>
          <button
            type="button"
            onClick={openDiscovery}
            className="flex h-11 shrink-0 items-center justify-center border border-border px-5 text-xs font-semibold uppercase tracking-[0.1em] text-burgundy transition-all active:scale-95 hover:border-accent hover:bg-accent-surface"
          >
            Подобрать кофе
          </button>
        </div>

        <div className="mb-8 sm:mb-10">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">
            Какой характер кофе вы ищете?
          </span>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={activeFlavor === null}
              onClick={() => setActiveFlavor(null)}
              className={`min-h-11 border px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] transition-all duration-150 active:scale-95 ${
                activeFlavor === null
                  ? "tab-active"
                  : "border-border bg-cream-dark text-text/70 hover:border-accent/40 hover:bg-accent-surface hover:text-burgundy"
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
                className={`min-h-11 border px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] transition-all duration-150 active:scale-95 ${
                  activeFlavor === direction
                    ? "tab-active"
                    : "border-border bg-cream-dark text-text/70 hover:border-accent/40 hover:bg-accent-surface hover:text-burgundy"
                }`}
              >
                {FLAVOR_DIRECTION_PROFILES[direction].label}
              </button>
            ))}
          </div>
          {activeFlavor && (
            <p className="mt-3 text-xs text-text/65">
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
                className={`min-h-11 border px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] transition-all duration-150 active:scale-95 ${
                  activeSection === category.id
                    ? "tab-active"
                    : "border-border bg-cream-dark text-text/70 hover:border-accent/40 hover:bg-accent-surface hover:text-burgundy"
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>

          {activeSection === "region" && (
            <div className="mt-4 flex flex-wrap gap-2 border-l-2 border-gold/40 pl-4">
              {REGION_COUNTRIES.map((country) => (
                <button
                  key={country}
                  type="button"
                  onClick={() => selectCountry(country)}
                  className={`min-h-11 border px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.08em] transition-all duration-150 active:scale-95 ${
                    activeCountry === country
                      ? "tab-active"
                      : "border-border bg-cream-dark text-text/65 hover:border-accent/40 hover:bg-accent-surface hover:text-burgundy"
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
          {catalogStatus === "unavailable" ? (
            <div
              role="status"
              className="rounded-xl border border-dashed border-border bg-cream-dark px-8 py-16 text-center"
            >
              <p className="font-display text-xl font-semibold text-burgundy">
                Каталог временно недоступен
              </p>
              <p className="mt-2 text-sm text-text/60">
                Мы уже разбираемся — обновите страницу через несколько минут.
              </p>
            </div>
          ) : orderedLots.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-cream-dark px-8 py-16 text-center">
              <p className="font-display text-xl font-semibold text-burgundy">
                Скоро в каталоге
              </p>
              <p className="mt-2 text-sm text-text/60">
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
                  className="flex cursor-pointer scroll-mt-28 flex-col overflow-hidden rounded-xl border border-border bg-surface transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-2 hover:border-accent/40 hover:shadow-xl active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between border-b border-border px-5 py-3">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text/65">
                      {lot.name}
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text/65">
                      Паспорт
                    </span>
                  </div>

                  <div className="flex-1 px-4 py-4 sm:px-5 sm:py-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-display text-xl font-semibold text-burgundy">
                          {lot.country || lot.name}
                        </h3>
                        {lot.region && (
                          <p className="text-xs uppercase tracking-[0.1em] text-text/65">
                            {lot.region}
                          </p>
                        )}
                      </div>
                      {typeof lot.qScore === "number" && (
                        <span
                          aria-label={`Оценка Q-грейдера: ${lot.qScore} из 100`}
                          className="shrink-0 border border-border px-2 py-0.5 text-[11px] font-bold text-text/70"
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
                      <p className="mt-3 font-display text-base italic leading-snug text-burgundy line-clamp-2">
                        «{lot.cupNote}»
                      </p>
                    )}

                    {/* Secondary detail — kept, but visually one notch quieter
                        than the cup note above it, so the card leads with one
                        strong flavor statement rather than two competing
                        ones (P26/P27: card decompression, content unchanged
                        from what LotPassportModal already repeats in full). */}
                    {(lot.description || lot.flavorProfile || entry) && (
                      <p className="mt-2 text-xs leading-relaxed text-text/60 line-clamp-2">
                        {lot.description ??
                          getWhoLikesIt(
                            lot,
                            characterDirection
                              ? FLAVOR_DIRECTION_PROFILES[characterDirection].reason
                              : null,
                          )}
                      </p>
                    )}

                    {/* Brew tip, origin specs, and the whole-bean fact were
                        three separate lines before P27 — same information,
                        one quiet line now, so the card stops stacking
                        near-identical-looking metadata captions. */}
                    <p className="mt-3 line-clamp-1 border-t border-border pt-3 text-[10px] uppercase tracking-[0.06em] text-text/60">
                      {[
                        brewHighlight
                          ? `${brewHighlight.label} ${brewHighlight.spec.ratio}, ${brewHighlight.spec.tempC}°C`
                          : null,
                        ...specParts,
                        "Только цельное зерно",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>

                  <div className="border-t border-border px-4 py-3 sm:px-5 sm:py-4">
                    <LotPurchaseControls
                      lot={lot}
                      buttonClassName="flex h-11 items-center justify-center bg-accent px-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-cream transition-all active:scale-95 hover:bg-accent-hover"
                    />
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
