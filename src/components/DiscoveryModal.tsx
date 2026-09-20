"use client";

import { useMemo, useState, type MouseEvent } from "react";
import Modal from "@/src/components/ui/Modal";
import LotPassportModal from "@/src/components/LotPassportModal";
import { useDiscovery } from "@/src/context/DiscoveryContext";
import { useCart } from "@/src/context/CartContext";
import { useCatalog } from "@/src/context/CatalogContext";
import { formatPrice } from "@/src/lib/format";
import { getBrewHighlight } from "@/src/lib/lotPresentation";
import { getLikedDislikedLotIds } from "@/src/lib/coffeePassport";
import {
  BREW_OPTIONS,
  NOVELTY_OPTIONS,
  TASTE_OPTIONS,
  getDiscoveryRecommendations,
  type BrewAnswer,
  type DiscoveryResult,
  type NoveltyAnswer,
  type TasteAnswer,
} from "@/src/lib/discovery";
import type { Lot } from "@/src/types/lot";

const TOTAL_QUESTIONS = 3;

function AnswerButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`min-h-14 w-full rounded-lg border px-5 py-3.5 text-left text-sm font-medium transition-all duration-150 active:scale-[0.98] ${
        selected
          ? "border-accent bg-accent text-cream"
          : "border-charcoal/15 bg-cream-dark text-charcoal/80 hover:border-accent/40 hover:bg-cream"
      }`}
    >
      {label}
    </button>
  );
}

export default function DiscoveryModal() {
  const { isOpen, closeDiscovery } = useDiscovery();
  const { addItem, flyToCart } = useCart();
  const { lots: LOTS } = useCatalog();

  const [step, setStep] = useState(0);
  const [taste, setTaste] = useState<TasteAnswer | null>(null);
  const [brew, setBrew] = useState<BrewAnswer | null>(null);
  const [novelty, setNovelty] = useState<NoveltyAnswer | null>(null);
  const [passportIndex, setPassportIndex] = useState<number | null>(null);

  const recommendations: DiscoveryResult[] = useMemo(() => {
    if (!taste || !brew || !novelty) return [];
    // Liked/disliked lots come from Coffee Passport tastings, if any exist
    // yet — a first-time buyer has none, so this is a no-op until they've
    // actually tasted something.
    const history = getLikedDislikedLotIds();
    return getDiscoveryRecommendations(LOTS, { taste, brew, novelty }, 3, history);
  }, [taste, brew, novelty, LOTS]);

  const restart = () => {
    setStep(0);
    setTaste(null);
    setBrew(null);
    setNovelty(null);
    setPassportIndex(null);
  };

  const selectTaste = (value: TasteAnswer) => {
    setTaste(value);
    setStep(1);
  };
  const selectBrew = (value: BrewAnswer) => {
    setBrew(value);
    setStep(2);
  };
  const selectNovelty = (value: NoveltyAnswer) => {
    setNovelty(value);
    setStep(3);
  };

  const goBack = () => setStep((current) => Math.max(0, current - 1));

  const handleAdd = (event: MouseEvent<HTMLButtonElement>, lot: Lot) => {
    flyToCart(event.currentTarget.getBoundingClientRect());
    addItem({ id: lot.id, name: lot.name, country: lot.country, price: lot.price });
  };

  const showResults = step === 3 && recommendations.length > 0;

  const stepTitles = [
    "Что вам ближе?",
    "Как вы готовите кофе?",
    "Что хотите попробовать?",
    "Вот что стоит попробовать",
  ];

  return (
    <>
      <Modal isOpen={isOpen} ariaLabel="Подбор кофе" onClose={closeDiscovery}>
        <div className="flex items-start justify-between gap-3 border-b border-charcoal/15 px-6 py-5">
          <div className="min-w-0">
            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-gold-dark">
              Подбор кофе
            </span>
            <h2 className="mt-1 font-display text-xl font-semibold text-burgundy sm:text-2xl">
              {stepTitles[step]}
            </h2>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {step > 0 && (
              <button
                type="button"
                onClick={restart}
                className="mr-1 hidden h-11 items-center px-2 text-xs font-semibold uppercase tracking-[0.08em] text-charcoal/65 transition-colors hover:text-burgundy sm:flex"
              >
                Начать заново
              </button>
            )}
            <button
              type="button"
              aria-label="Закрыть подбор кофе"
              onClick={closeDiscovery}
              className="flex h-11 w-11 items-center justify-center text-charcoal/60 transition-transform active:scale-90 hover:text-burgundy"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </div>

        {step < TOTAL_QUESTIONS && (
          <div className="border-b border-charcoal/10 px-6 py-2 text-center text-[11px] uppercase tracking-[0.15em] text-charcoal/65">
            Вопрос {step + 1} из {TOTAL_QUESTIONS}
          </div>
        )}

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          {step === 0 && (
            <div className="space-y-2.5">
              {TASTE_OPTIONS.map((option) => (
                <AnswerButton
                  key={option.value}
                  label={option.label}
                  selected={taste === option.value}
                  onClick={() => selectTaste(option.value)}
                />
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-2.5">
              {BREW_OPTIONS.map((option) => (
                <AnswerButton
                  key={option.value}
                  label={option.label}
                  selected={brew === option.value}
                  onClick={() => selectBrew(option.value)}
                />
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-2.5">
              {NOVELTY_OPTIONS.map((option) => (
                <AnswerButton
                  key={option.value}
                  label={option.label}
                  selected={novelty === option.value}
                  onClick={() => selectNovelty(option.value)}
                />
              ))}
            </div>
          )}

          {step === 3 && !showResults && (
            <p className="text-sm leading-relaxed text-charcoal/65">
              В каталоге пока нет лотов — загляните чуть позже.
            </p>
          )}

          {showResults &&
            recommendations.map((result, index) => {
              const brewHighlight = getBrewHighlight(result.lot);
              return (
                <div
                  key={result.lot.id}
                  className="rounded-xl border border-border bg-cream-dark/60 p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-burgundy/65">
                        {result.lot.name}
                      </span>
                      <h3 className="font-display text-lg font-semibold text-burgundy">
                        {result.lot.country || result.lot.name}
                      </h3>
                      <p className="text-xs uppercase tracking-[0.1em] text-burgundy/65">
                        {result.lot.region}
                      </p>
                    </div>
                    <span className="shrink-0 font-display text-lg font-semibold text-burgundy">
                      {formatPrice(result.lot.price)}
                    </span>
                  </div>

                  {result.lot.cupNote && (
                    <p className="mt-3 font-display text-sm italic leading-snug text-burgundy">
                      «{result.lot.cupNote}»
                    </p>
                  )}

                  <p className="mt-3 text-sm leading-relaxed text-burgundy/80">
                    {result.reason}
                  </p>

                  {brewHighlight && (
                    <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.06em] text-burgundy/65">
                      Как готовить: {brewHighlight.label} · {brewHighlight.spec.ratio}, {brewHighlight.spec.tempC}°C
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={(event) => handleAdd(event, result.lot)}
                      className="flex h-11 items-center justify-center bg-accent px-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-cream transition-all active:scale-95 hover:bg-accent-hover"
                    >
                      В корзину
                    </button>
                    <button
                      type="button"
                      onClick={() => setPassportIndex(index)}
                      className="flex h-11 items-center justify-center border border-burgundy/30 px-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-burgundy transition-all active:scale-95 hover:bg-burgundy/10"
                    >
                      Открыть паспорт
                    </button>
                  </div>
                </div>
              );
            })}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-charcoal/15 px-6 py-5">
          {step > 0 ? (
            <button
              type="button"
              onClick={goBack}
              className="flex h-11 items-center px-2 text-xs font-semibold uppercase tracking-[0.1em] text-charcoal/65 transition-colors hover:text-burgundy"
            >
              ← Назад
            </button>
          ) : (
            <span />
          )}

          {step === TOTAL_QUESTIONS && (
            <button
              type="button"
              onClick={restart}
              className="border border-burgundy px-6 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-burgundy transition-all active:scale-95 hover:bg-burgundy hover:text-cream"
            >
              Начать заново
            </button>
          )}
        </div>
      </Modal>

      <LotPassportModal
        lot={passportIndex !== null ? (recommendations[passportIndex]?.lot ?? null) : null}
        isOpen={passportIndex !== null}
        onClose={() => setPassportIndex(null)}
        onPrev={() =>
          setPassportIndex((current) =>
            current === null || recommendations.length === 0
              ? current
              : (current - 1 + recommendations.length) % recommendations.length,
          )
        }
        onNext={() =>
          setPassportIndex((current) =>
            current === null || recommendations.length === 0
              ? current
              : (current + 1) % recommendations.length,
          )
        }
        hasMultiple={recommendations.length > 1}
        position={
          passportIndex !== null
            ? { index: passportIndex, total: recommendations.length }
            : null
        }
      />
    </>
  );
}
