"use client";

import { useState, type MouseEvent } from "react";
import Modal from "@/src/components/ui/Modal";
import WholeBeanNotice from "@/src/components/WholeBeanNotice";
import FlavorProfileChart from "@/src/components/FlavorProfileChart";
import { useCart } from "@/src/context/CartContext";
import { formatPrice } from "@/src/lib/format";
import {
  getBrewHighlight,
  getLotFactChips,
  getWhoLikesIt,
  getWhyTry,
  isEntryProduct,
} from "@/src/lib/lotPresentation";
import {
  FLAVOR_DIRECTION_PROFILES,
  getBestFlavorDirection,
  getSimilarLots,
} from "@/src/lib/flavorMatch";
import {
  getLikedDislikedLotIds,
  getTastingRecordsForLot,
} from "@/src/lib/coffeePassport";
import { getCoffeePassportUrl } from "@/src/lib/coffeePassportLink";
import { useCatalog } from "@/src/context/CatalogContext";
import type { Lot } from "@/src/types/lot";

const BREW_LABELS = {
  v60: "V60",
  immersion: "Иммерсия",
  espresso: "Эспрессо",
} as const;

export default function LotPassportModal({
  lot,
  isOpen,
  onClose,
  onPrev,
  onNext,
  onSelectLot,
  hasMultiple,
  position,
  transitionClassName = "",
}: {
  lot: Lot | null;
  isOpen: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  /** Jump straight to a specific lot (e.g. from "Похожие лоты"), instead of
   *  stepping through the current prev/next order. Omit to render similar
   *  lots as non-interactive (e.g. from the post-purchase Coffee Passport,
   *  which navigates its own separate set of purchased lots). */
  onSelectLot?: (lotId: string) => void;
  hasMultiple: boolean;
  position: { index: number; total: number } | null;
  transitionClassName?: string;
}) {
  return (
    <Modal isOpen={isOpen} ariaLabel="Паспорт зерна" onClose={onClose}>
      {lot && (
        <div
          className={`flex flex-1 flex-col overflow-hidden transition-all duration-300 ease-in-out ${transitionClassName}`}
        >
          {/* Remounting per lot id resets the quantity stepper below without an effect. */}
          <LotPassportContent
            key={lot.id}
            lot={lot}
            onClose={onClose}
            onPrev={onPrev}
            onNext={onNext}
            onSelectLot={onSelectLot}
            hasMultiple={hasMultiple}
            position={position}
          />
        </div>
      )}
    </Modal>
  );
}

function LotPassportContent({
  lot,
  onClose,
  onPrev,
  onNext,
  onSelectLot,
  hasMultiple,
  position,
}: {
  lot: Lot;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSelectLot?: (lotId: string) => void;
  hasMultiple: boolean;
  position: { index: number; total: number } | null;
}) {
  const { addItem, flyToCart } = useCart();
  const { lots: LOTS } = useCatalog();
  const [quantity, setQuantity] = useState(1);
  const entry = isEntryProduct(lot);
  const brewHighlight = getBrewHighlight(lot);
  const factChips = getLotFactChips(lot);
  // Level 2's deep technical table — same "only show what's actually
  // there" rule as everything else here. Kept local rather than reusing
  // getLotFactChips: this table has different labels/wording for its
  // "read this if you want to go deep" audience (vs. the Level-1 chips'
  // glanceable ones) and also carries farm, which chips deliberately don't.
  const techRows: { label: string; value: string }[] = [];
  if (typeof lot.farm === "string" && lot.farm.trim()) {
    techRows.push({ label: "Ферма / станция", value: lot.farm });
  }
  if (typeof lot.altitudeMasl === "number" && Number.isFinite(lot.altitudeMasl)) {
    techRows.push({ label: "Высота", value: `${lot.altitudeMasl} MASL` });
  }
  if (typeof lot.variety === "string" && lot.variety.trim()) {
    techRows.push({ label: "Разновидность", value: lot.variety });
  }
  if (typeof lot.process === "string" && lot.process.trim()) {
    techRows.push({ label: "Обработка", value: lot.process });
  }
  if (typeof lot.qScore === "number" && Number.isFinite(lot.qScore)) {
    techRows.push({ label: "Оценка Q-грейдера", value: `${lot.qScore} / 100` });
  }
  // A tasting set's one FlavorProfile blends three different lots' worth of
  // character — same reasoning src/lib/personalTaste.ts uses to exclude it
  // from direction tallying, so it isn't given a single misleading label
  // here either.
  const characterDirection = entry ? null : getBestFlavorDirection(lot);
  const characterReason = characterDirection
    ? FLAVOR_DIRECTION_PROFILES[characterDirection].reason
    : null;
  const whyTry = getWhyTry(lot, characterReason);
  // Pass the same character reason through so this sentence can never
  // contradict the direction label shown just above it.
  const whoLikesIt = getWhoLikesIt(lot, characterReason);
  // This content only ever mounts from a click (opening the modal), always
  // well after hydration — safe to read tasting history directly here with
  // no server/client mismatch risk.
  const similarLots = getSimilarLots(lot, LOTS, 3, getLikedDislikedLotIds());
  const myTastings = getTastingRecordsForLot(lot.id);
  // null until the external Coffee Passport platform's URL template is
  // configured — see src/lib/coffeePassportLink.ts. No link renders until
  // then; this is not a placeholder link to a guessed destination.
  const coffeePassportUrl = getCoffeePassportUrl(lot.id);

  const handleAdd = (event: MouseEvent<HTMLButtonElement>) => {
    flyToCart(event.currentTarget.getBoundingClientRect());
    addItem(
      {
        id: lot.id,
        name: lot.name,
        country: lot.country,
        price: lot.price,
      },
      quantity,
    );
  };

  return (
    <>
      <div className="flex items-start justify-between gap-3 border-b border-charcoal/15 px-6 py-5">
            <div className="min-w-0">
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-gold-dark">
                Паспорт зерна · {lot.name}
              </span>
              <div className="mt-1 flex items-center gap-2">
                <h2 className="font-display text-2xl font-semibold text-burgundy">
                  {lot.country || lot.name}
                </h2>
                {typeof lot.qScore === "number" && (
                  <span
                    aria-label={`Оценка Q-грейдера: ${lot.qScore} из 100`}
                    className="shrink-0 border border-border px-2 py-0.5 text-[11px] font-bold text-text/70"
                  >
                    {lot.qScore} Q
                  </span>
                )}
              </div>
              <p className="text-sm uppercase tracking-[0.1em] text-charcoal/65">
                {lot.region}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {hasMultiple && (
                <>
                  <button
                    type="button"
                    aria-label="Предыдущий лот"
                    onClick={onPrev}
                    className="flex h-11 w-11 items-center justify-center text-charcoal/60 transition-transform active:scale-90 hover:text-burgundy"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path d="M15 6l-6 6 6 6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    aria-label="Следующий лот"
                    onClick={onNext}
                    className="flex h-11 w-11 items-center justify-center text-charcoal/60 transition-transform active:scale-90 hover:text-burgundy"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </button>
                </>
              )}
              <button
                type="button"
                aria-label="Закрыть"
                onClick={onClose}
                className="flex h-11 w-11 items-center justify-center text-charcoal/60 transition-transform active:scale-90 hover:text-burgundy"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
          </div>

          {position && position.total > 1 && (
            <div className="border-b border-charcoal/10 px-6 py-2 text-center text-[11px] uppercase tracking-[0.15em] text-charcoal/65">
              Лот {position.index + 1} из {position.total}
            </div>
          )}

          <div className="flex-1 space-y-8 overflow-y-auto px-6 py-6">
            {/* Level 1: plain-language summary — read this, then scroll for the full Passport. */}
            <section className="rounded-xl border border-border bg-cream-dark/60 p-5">
              {entry && (
                <span className="mb-3 inline-flex items-center border border-gold bg-gold/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-gold-dark">
                  Точка входа · Попробовать несколько характеров
                </span>
              )}
              {characterDirection && (
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.1em] text-gold-dark">
                  {FLAVOR_DIRECTION_PROFILES[characterDirection].label}
                </span>
              )}
              {lot.cupNote && (
                <p className="font-display text-lg italic leading-relaxed text-burgundy">
                  «{lot.cupNote}»
                </p>
              )}
              <p className="mt-4 text-sm leading-relaxed text-burgundy/80">
                <span className="font-semibold text-burgundy">
                  Почему попробовать:{" "}
                </span>
                {whyTry}
              </p>
              {factChips.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-burgundy/70">
                  {factChips.map((chip) => (
                    <span key={chip.label}>
                      <span className="text-burgundy/65">{chip.label}: </span>
                      {chip.value}
                    </span>
                  ))}
                </div>
              )}
              {lot.description ? (
                <p className="mt-3 text-sm leading-relaxed text-burgundy/80">
                  {lot.description}
                </p>
              ) : (
                (lot.flavorProfile || entry) && (
                  <p className="mt-3 text-sm leading-relaxed text-burgundy/80">
                    <span className="font-semibold text-burgundy">
                      Кому понравится:{" "}
                    </span>
                    {whoLikesIt}
                  </p>
                )
              )}
              {myTastings.length > 0 && (
                <p className="mt-2 text-sm leading-relaxed text-burgundy/80">
                  <span className="font-semibold text-burgundy">
                    Вы уже пробовали этот кофе.{" "}
                  </span>
                  {myTastings.length === 1
                    ? `Ваша оценка — ${myTastings[0].rating.overall}/5.`
                    : `Дегустаций: ${myTastings.length}. Последняя оценка — ${myTastings[0].rating.overall}/5.`}
                </p>
              )}
              {brewHighlight && (
                <p className="mt-2 text-sm leading-relaxed text-burgundy/80">
                  <span className="font-semibold text-burgundy">
                    Как приготовить:{" "}
                  </span>
                  {brewHighlight.label} · {brewHighlight.spec.ratio}, {brewHighlight.spec.tempC}°C
                  {brewHighlight.note ? ` — ${brewHighlight.note}` : ""} (полный
                  рецепт ниже).
                </p>
              )}
            </section>

            {coffeePassportUrl && (
              <a
                href={coffeePassportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm font-semibold text-burgundy underline-offset-2 hover:underline"
              >
                Coffee Passport этого лота →
              </a>
            )}

            {lot.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {lot.tags.map((tag) => (
                  <span
                    key={tag}
                    className="border border-border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-text/65"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {lot.sensory.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-dark">
                  Ноты в чашке
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {lot.sensory.map((note) => (
                    <span
                      key={note}
                      className="bg-cream-dark px-3 py-1.5 text-sm font-medium text-burgundy"
                    >
                      {note}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {lot.flavorProfile && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-dark">
                  Вкусовая диаграмма
                </h3>
                <div className="mt-4 rounded-2xl border border-border bg-cream-dark/60 p-4 shadow-sm sm:p-6">
                  <FlavorProfileChart profile={lot.flavorProfile} />
                </div>
              </section>
            )}

            {techRows.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-dark">
                  Технические данные
                </h3>
                <dl className="mt-3 divide-y divide-charcoal/10 border-y border-charcoal/10 text-sm">
                  {techRows.map((row) => (
                    <div key={row.label} className="flex justify-between py-2.5">
                      <dt className="text-charcoal/65">{row.label}</dt>
                      <dd className="text-right font-medium">{row.value}</dd>
                    </div>
                  ))}
                </dl>
                {typeof lot.qScore === "number" && (
                  <p className="mt-2 text-xs leading-relaxed text-charcoal/65">
                    Q-грейд — независимая оценка качества зелёного кофе по
                    100-балльной шкале: от 80 баллов начинается уровень
                    спешелти. Это не рейтинг XO COFFEE и не про личный вкус —
                    за это отвечают профиль лота и «Кому понравится» выше.
                  </p>
                )}
              </section>
            )}

            {lot.farmStory && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-dark">
                  Ферма и терруар
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-charcoal/75">
                  {lot.farmStory}
                </p>
              </section>
            )}

            {(() => {
              // Defensive: brew, and each method within it, is optional —
              // skip a missing method's card instead of rendering an
              // invented ratio/temp/time.
              const brew = lot.brew;
              if (!brew) return null;
              const brewMethods = (
                Object.keys(BREW_LABELS) as (keyof typeof BREW_LABELS)[]
              ).filter((method) => brew[method]);
              if (brewMethods.length === 0) return null;
              return (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-dark">
                    Рекомендации по завариванию
                  </h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    {brewMethods.map((method) => {
                      const spec = brew[method];
                      if (!spec) return null;
                      return (
                        <div
                          key={method}
                          className="border border-charcoal/15 bg-cream-dark p-4"
                        >
                          <p className="font-display text-base font-semibold text-burgundy">
                            {BREW_LABELS[method]}
                          </p>
                          <dl className="mt-3 space-y-1.5 text-xs">
                            <div className="flex justify-between">
                              <dt className="text-charcoal/65">Пропорция</dt>
                              <dd className="font-medium">{spec.ratio}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-charcoal/65">Температура</dt>
                              <dd className="font-medium">{spec.tempC}°C</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-charcoal/65">Время</dt>
                              <dd className="font-medium">{spec.timeLabel}</dd>
                            </div>
                          </dl>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })()}

            {similarLots.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-dark">
                  Если вам нравится этот кофе
                </h3>
                <div className="mt-3 space-y-3">
                  {similarLots.map(({ lot: similarLot, reason }) => {
                    const cardBody = (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-display text-base font-semibold text-burgundy">
                              {similarLot.country || similarLot.name}
                            </p>
                            <p className="text-xs uppercase tracking-[0.08em] text-charcoal/65">
                              {similarLot.region}
                            </p>
                          </div>
                          <span className="shrink-0 font-display text-sm font-semibold text-burgundy">
                            {formatPrice(similarLot.price)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-charcoal/75">
                          {reason}
                        </p>
                      </>
                    );

                    if (!onSelectLot) {
                      return (
                        <div
                          key={similarLot.id}
                          className="border border-charcoal/15 bg-cream-dark p-4 text-left"
                        >
                          {cardBody}
                        </div>
                      );
                    }

                    return (
                      <button
                        key={similarLot.id}
                        type="button"
                        onClick={() => onSelectLot(similarLot.id)}
                        className="block w-full border border-border bg-cream-dark p-4 text-left transition-all active:scale-[0.99] hover:border-accent/40 hover:bg-cream"
                      >
                        {cardBody}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            <WholeBeanNotice />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-charcoal/15 px-6 py-5">
            <span className="shrink-0 whitespace-nowrap font-display text-xl font-semibold text-burgundy">
              {formatPrice(lot.price * quantity)}
            </span>

            <div className="flex shrink-0 items-center gap-3">
              <div className="flex items-center border border-charcoal/20">
                <button
                  type="button"
                  aria-label="Уменьшить количество"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="flex h-11 w-9 items-center justify-center text-charcoal/70 transition-transform active:scale-90 hover:text-burgundy"
                >
                  −
                </button>
                <span className="flex h-11 w-9 items-center justify-center text-sm font-medium">
                  {quantity}
                </span>
                <button
                  type="button"
                  aria-label="Увеличить количество"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="flex h-11 w-9 items-center justify-center text-charcoal/70 transition-transform active:scale-90 hover:text-burgundy"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={handleAdd}
                className="whitespace-nowrap bg-accent px-6 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-cream transition-all active:scale-95 hover:bg-accent-hover"
              >
                В корзину
              </button>
            </div>
          </div>
    </>
  );
}
