const CLASSIC_POINTS = [
  "Тёмная обжарка маскирует происхождение зерна",
  "Единый профиль на все сорта и регионы",
  "Вкус обжарки перебивает вкус кофе",
  "Горечь считается нормой, а не браком",
];

const PURE_ROAST_POINTS = [
  "Профиль подбирается под конкретный лот и высоту произрастания",
  "Обжарка останавливается в момент раскрытия сахаров, до карамелизации в уголь",
  "Кислотность, сладость и терруар остаются читаемыми в чашке",
  "Каждая партия проходит каппинг до и после обжарки",
];

export default function Approach() {
  return (
    <section id="approach" className="px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-2xl border border-gold/20 bg-backdrop/35 p-5 shadow-2xl backdrop-blur-[10px] sm:p-8 md:rounded-3xl md:p-12 lg:p-16">
        <div className="mb-8 max-w-2xl sm:mb-10">
          <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gold">
            Подход
          </span>
          <h2 className="mt-4 font-display text-3xl font-semibold text-cream sm:text-4xl md:text-5xl">
            Обжарка ради вкуса, а не привычки
          </h2>
        </div>

        <div className="grid gap-5 sm:gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-gold/30 bg-cream/85 p-6 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-2.5 hover:shadow-2xl sm:p-7 lg:p-9">
            <h3 className="font-display text-xl font-semibold text-burgundy">
              Классическая обжарка
            </h3>
            <ul className="mt-5 space-y-3">
              {CLASSIC_POINTS.map((point) => (
                <li key={point} className="flex gap-3 text-sm text-burgundy/80">
                  <span className="mt-0.5 leading-none">—</span>
                  <span className="leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-gold/30 bg-burgundy p-6 text-cream shadow-sm transition-all duration-300 hover:-translate-y-2.5 hover:border-gold/50 hover:shadow-2xl sm:p-7 lg:p-9">
            <h3 className="font-display text-xl font-semibold text-gold">
              Pure Roast
            </h3>
            <ul className="mt-5 space-y-3">
              {PURE_ROAST_POINTS.map((point) => (
                <li key={point} className="flex gap-3 text-sm">
                  <span className="mt-0.5 leading-none text-gold">—</span>
                  <span className="leading-relaxed text-cream/90">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
