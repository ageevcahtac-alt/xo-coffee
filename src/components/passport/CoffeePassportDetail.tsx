"use client";

import { useEffect, useState } from "react";
import FlavorProfileChart from "@/src/components/FlavorProfileChart";
import {
  createTastingId,
  getTastingRecordsForLot,
  saveTastingRecord,
} from "@/src/lib/coffeePassport";
import { getWhoLikesIt, isEntryProduct } from "@/src/lib/lotPresentation";
import type { BrewMethodKey, MyCupRating, TastingRecord } from "@/src/types/coffeePassport";
import type { Lot } from "@/src/types/lot";

const BREW_METHOD_LABELS: Record<BrewMethodKey, string> = {
  v60: "V60",
  immersion: "Иммерсия / батч",
  espresso: "Эспрессо",
  other: "Свой способ",
};

const RATING_LABELS: { key: keyof MyCupRating; label: string }[] = [
  { key: "acidity", label: "Кислотность" },
  { key: "sweetness", label: "Сладость" },
  { key: "body", label: "Тело" },
  { key: "overall", label: "Насколько понравилось" },
];

const BLANK_RATING: MyCupRating = { acidity: 3, sweetness: 3, body: 3, overall: 3 };

function firstAvailableBrewMethod(lot: Lot): BrewMethodKey {
  if (lot.brew?.v60) return "v60";
  if (lot.brew?.espresso) return "espresso";
  if (lot.brew?.immersion) return "immersion";
  return "other";
}

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

function RatingScale({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-burgundy">{label}</span>
        <span className="text-xs text-burgundy/50">{value} / 5</span>
      </div>
      <div className="mt-2 flex gap-2" role="group" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={value === n}
            aria-label={`${label}: ${n} из 5`}
            onClick={() => onChange(n)}
            className={`flex h-11 flex-1 items-center justify-center border text-sm font-semibold transition-all active:scale-95 ${
              n <= value
                ? "border-gold bg-gold text-burgundy"
                : "border-charcoal/20 bg-cream-dark text-charcoal/40 hover:border-gold/50"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function CoffeePassportDetail({
  lot,
  orderNumber,
  onOpenLotPassport,
}: {
  lot: Lot;
  orderNumber: string;
  onOpenLotPassport: () => void;
}) {
  const entry = isEntryProduct(lot);
  const availableBrewMethods = (["v60", "immersion", "espresso"] as const).filter(
    (method) => Boolean(lot.brew?.[method]),
  );

  const [records, setRecords] = useState<TastingRecord[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [brewMethod, setBrewMethod] = useState<BrewMethodKey>(() =>
    firstAvailableBrewMethod(lot),
  );
  const [component, setComponent] = useState<string | undefined>(undefined);
  const [rating, setRating] = useState<MyCupRating>(BLANK_RATING);
  const [note, setNote] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  // localStorage is only available client-side — load after mount, same
  // reasoning as CartContext, to avoid a server/client hydration mismatch.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setRecords(getTastingRecordsForLot(lot.id));
    setHydrated(true);
    setEditingId(null);
    setBrewMethod(firstAvailableBrewMethod(lot));
    setComponent(undefined);
    setRating(BLANK_RATING);
    setNote("");
  }, [lot]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!savedFlash) return;
    const timeout = setTimeout(() => setSavedFlash(false), 2500);
    return () => clearTimeout(timeout);
  }, [savedFlash]);

  const loadRecordIntoForm = (record: TastingRecord) => {
    setEditingId(record.id);
    setBrewMethod(record.brewMethod);
    setComponent(record.component);
    setRating(record.rating);
    setNote(record.note);
    setSavedFlash(false);
  };

  const startNewTasting = () => {
    setEditingId(null);
    setBrewMethod(firstAvailableBrewMethod(lot));
    setComponent(undefined);
    setRating(BLANK_RATING);
    setNote("");
    setSavedFlash(false);
  };

  const handleSave = () => {
    const id = editingId ?? createTastingId(lot.id);
    const record: TastingRecord = {
      id,
      orderNumber,
      lotId: lot.id,
      component: entry ? component : undefined,
      brewMethod,
      rating,
      note: note.trim(),
      createdAt: new Date().toISOString(),
    };
    saveTastingRecord(record);
    setRecords(getTastingRecordsForLot(lot.id));
    setEditingId(id);
    setSavedFlash(true);
  };

  const setRatingAxis = (key: keyof MyCupRating, value: number) =>
    setRating((prev) => ({ ...prev, [key]: value }));

  const characters = entry
    ? lot.country
        .split("/")
        .map((part) => part.trim())
        .filter(Boolean)
    : [];

  return (
    <div className="space-y-6">
      {/* Level 1 — what you bought, how to try it, what to expect */}
      <section className="rounded-xl border border-gold/30 bg-cream-dark/60 p-5">
        <span className="text-xs font-semibold uppercase tracking-[0.15em] text-gold-dark">
          Что вы купили
        </span>
        <h3 className="mt-1 font-display text-xl font-semibold text-burgundy">
          {lot.country}
        </h3>
        <p className="text-xs uppercase tracking-[0.1em] text-burgundy/60">
          {lot.region} · {lot.name}
        </p>
        {lot.cupNote && (
          <p className="mt-3 font-display text-base italic leading-relaxed text-burgundy">
            «{lot.cupNote}»
          </p>
        )}
        <p className="mt-3 text-sm leading-relaxed text-burgundy/80">
          <span className="font-semibold text-burgundy">Что почувствовать: </span>
          {getWhoLikesIt(lot)}
        </p>
      </section>

      {/* Brew method for this tasting */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-dark">
          Как попробовать
        </h3>
        {availableBrewMethods.length > 0 ? (
          <>
            <div className="mt-3 flex flex-wrap gap-2">
              {[...availableBrewMethods, "other" as const].map((method) => (
                <button
                  key={method}
                  type="button"
                  aria-pressed={brewMethod === method}
                  onClick={() => setBrewMethod(method)}
                  className={`min-h-11 border px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] transition-all active:scale-95 ${
                    brewMethod === method
                      ? "border-gold bg-burgundy text-cream"
                      : "border-charcoal/20 bg-cream-dark text-charcoal/70 hover:border-gold/50"
                  }`}
                >
                  {BREW_METHOD_LABELS[method]}
                </button>
              ))}
            </div>
            {brewMethod !== "other" && lot.brew?.[brewMethod] && (
              <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-charcoal/70">
                <div className="flex gap-1.5">
                  <dt className="text-charcoal/45">Пропорция</dt>
                  <dd className="font-medium">{lot.brew[brewMethod].ratio}</dd>
                </div>
                <div className="flex gap-1.5">
                  <dt className="text-charcoal/45">Температура</dt>
                  <dd className="font-medium">{lot.brew[brewMethod].tempC}°C</dd>
                </div>
                <div className="flex gap-1.5">
                  <dt className="text-charcoal/45">Время</dt>
                  <dd className="font-medium">{lot.brew[brewMethod].timeLabel}</dd>
                </div>
              </dl>
            )}
            {brewMethod === "other" && (
              <p className="mt-3 text-sm text-charcoal/60">
                Попробуйте привычным для вас способом и оцените чашку.
              </p>
            )}
          </>
        ) : (
          <p className="mt-3 text-sm text-charcoal/60">
            Попробуйте привычным для вас способом и оцените чашку.
          </p>
        )}
      </section>

      {/* My Cup — personal impression, separate from the reference profile below */}
      <section className="border border-charcoal/15 bg-cream-dark/40 p-5">
        <h3 className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-dark">
          Моя чашка
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-charcoal/60">
          Ваше личное впечатление — оно не обязано совпадать с профилем лота.
        </p>

        {entry && characters.length > 0 && (
          <div className="mt-4">
            <span className="text-sm font-medium text-burgundy">
              Какой характер пробуете?
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {characters.map((character) => (
                <button
                  key={character}
                  type="button"
                  aria-pressed={component === character}
                  onClick={() => setComponent(character)}
                  className={`min-h-11 border px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] transition-all active:scale-95 ${
                    component === character
                      ? "border-gold bg-burgundy text-cream"
                      : "border-charcoal/20 bg-cream text-charcoal/70 hover:border-gold/50"
                  }`}
                >
                  {character}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 space-y-4">
          {RATING_LABELS.map(({ key, label }) => (
            <RatingScale
              key={key}
              label={label}
              value={rating[key]}
              onChange={(value) => setRatingAxis(key, value)}
            />
          ))}
        </div>

        <label className="mt-5 block">
          <span className="text-sm font-medium text-burgundy">Что вы почувствовали?</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value.slice(0, 2000))}
            placeholder="Опишите чашку своими словами — необязательно официальными терминами"
            rows={3}
            maxLength={2000}
            className="mt-2 w-full border border-charcoal/20 bg-cream px-4 py-3 text-sm text-charcoal placeholder:text-charcoal/40 outline-none transition-colors focus:border-burgundy"
          />
        </label>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            className="flex h-11 items-center justify-center bg-burgundy px-6 text-xs font-semibold uppercase tracking-[0.12em] text-cream transition-all active:scale-95 hover:bg-burgundy-dark"
          >
            {editingId ? "Сохранить изменения" : "Сохранить дегустацию"}
          </button>
          {records.length > 0 && (
            <button
              type="button"
              onClick={startNewTasting}
              className="flex h-11 items-center justify-center border border-burgundy/30 px-4 text-xs font-semibold uppercase tracking-[0.1em] text-burgundy transition-all active:scale-95 hover:bg-burgundy/10"
            >
              Добавить новую дегустацию
            </button>
          )}
          {savedFlash && (
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-gold-dark">
              Сохранено ✓
            </span>
          )}
        </div>
      </section>

      {/* Tasting history for this lot */}
      {hydrated && records.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-dark">
            История дегустаций
          </h3>
          <div className="mt-3 space-y-3">
            {records.map((record) => (
              <div
                key={record.id}
                className="border border-charcoal/15 bg-cream-dark/40 p-4 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs uppercase tracking-[0.08em] text-charcoal/50">
                    {formatTastingDate(record.createdAt)} ·{" "}
                    {BREW_METHOD_LABELS[record.brewMethod]}
                    {record.component ? ` · ${record.component}` : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => loadRecordIntoForm(record)}
                    className="text-xs font-semibold uppercase tracking-[0.08em] text-burgundy transition-colors hover:text-gold-dark"
                  >
                    Изменить
                  </button>
                </div>
                <p className="mt-2 text-xs text-charcoal/60">
                  Кислотность {record.rating.acidity} · Сладость{" "}
                  {record.rating.sweetness} · Тело {record.rating.body} · Понравилось{" "}
                  {record.rating.overall}/5
                </p>
                {record.note && (
                  <p className="mt-2 leading-relaxed text-charcoal/80">
                    «{record.note}»
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Level 2 — reference profile, kept compact; full data lives in the Lot Passport */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-dark">
          Профиль лота
        </h3>
        {lot.flavorProfile ? (
          <div className="mt-3 rounded-2xl border border-gold/20 bg-cream-dark/60 p-4 shadow-sm sm:p-6">
            <FlavorProfileChart profile={lot.flavorProfile} />
          </div>
        ) : (
          <p className="mt-3 text-sm text-charcoal/60">Профиль пока не описан.</p>
        )}
        <p className="mt-3 text-xs text-charcoal/60">
          {lot.region} · {lot.variety} · {lot.process} · {lot.altitudeMasl} MASL · Q{" "}
          {lot.qScore}
        </p>
        <button
          type="button"
          onClick={onOpenLotPassport}
          className="mt-4 flex h-11 items-center justify-center border border-burgundy px-6 text-xs font-semibold uppercase tracking-[0.12em] text-burgundy transition-all active:scale-95 hover:bg-burgundy hover:text-cream"
        >
          Открыть полный Lot Passport
        </button>
      </section>
    </div>
  );
}
