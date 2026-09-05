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
import lotsData from "@/src/data/lots.json";
import type { Lot } from "@/src/types/lot";

const LOTS = lotsData as Lot[];

export default function Catalog() {
  const { addItem, flyToCart } = useCart();
  const [activeSection, setActiveSection] = useState<TopCategoryId>("all");
  const [activeCountry, setActiveCountry] = useState<RegionCountry | null>(
    null,
  );
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

  // Keep activeIndex alive through the closing animation (Modal fades out
  // over ~400ms) so the displayed lot doesn't disappear mid-transition.
  useEffect(() => {
    if (!modalOpen) {
      const timeout = setTimeout(() => setActiveIndex(null), 400);
      return () => clearTimeout(timeout);
    }
  }, [modalOpen]);

  const displayLot = activeIndex !== null ? (visibleLots[activeIndex] ?? null) : null;

  const openLot = (lot: Lot) => {
    const index = visibleLots.findIndex((l) => l.id === lot.id);
    setActiveIndex(index === -1 ? 0 : index);
    setModalOpen(true);
  };

  const goToPrevLot = () => {
    lotTransition.runTransition(() => {
      setActiveIndex((index) => {
        if (index === null || visibleLots.length === 0) return index;
        return (index - 1 + visibleLots.length) % visibleLots.length;
      });
    });
  };

  const goToNextLot = () => {
    lotTransition.runTransition(() => {
      setActiveIndex((index) => {
        if (index === null || visibleLots.length === 0) return index;
        return (index + 1) % visibleLots.length;
      });
    });
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
          {visibleLots.length === 0 ? (
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
              {visibleLots.map((lot) => (
                <article
                  key={lot.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openLot(lot)}
                  onKeyDown={(event) => handleCardKeyDown(event, lot)}
                  className="flex cursor-pointer flex-col overflow-hidden rounded-xl border border-gold/30 bg-cream/85 backdrop-blur-md transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-2 hover:border-gold hover:shadow-xl active:scale-[0.98]"
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
                      <span className="shrink-0 border border-gold/40 bg-cream px-2 py-0.5 text-[11px] font-bold text-burgundy">
                        {lot.qScore} Q
                      </span>
                    </div>

                    <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-burgundy/10 pt-3 text-[11px]">
                      <div>
                        <dt className="text-burgundy/55">Высота</dt>
                        <dd className="font-medium text-burgundy">{lot.altitudeMasl} MASL</dd>
                      </div>
                      <div>
                        <dt className="text-burgundy/55">Обработка</dt>
                        <dd className="font-medium text-burgundy">{lot.process}</dd>
                      </div>
                      <div>
                        <dt className="text-burgundy/55">Сорт</dt>
                        <dd className="truncate font-medium text-burgundy">{lot.variety}</dd>
                      </div>
                      <div>
                        <dt className="text-burgundy/55">Ферма</dt>
                        <dd className="truncate font-medium text-burgundy">{lot.farm}</dd>
                      </div>
                    </dl>

                    <p className="mt-3 text-xs italic text-burgundy/75 line-clamp-2">
                      {lot.sensory.join(", ")}
                    </p>

                    <p className="mt-2 font-display text-sm italic leading-snug text-burgundy line-clamp-2">
                      «{lot.cupNote}»
                    </p>

                    <p className="mt-3 text-[10px] uppercase tracking-[0.06em] text-burgundy/50">
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
              ))}
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
        hasMultiple={visibleLots.length > 1}
        position={
          activeIndex !== null
            ? { index: activeIndex, total: visibleLots.length }
            : null
        }
        transitionClassName={lotTransition.className}
      />
    </section>
  );
}
