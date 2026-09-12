const PROCESS_STEPS = [
  {
    n: "01",
    title: "Зерно",
    text: "Каждый лот приходит со своей историей: происхождение, высота, сорт, обработка.",
  },
  {
    n: "02",
    title: "Анализ",
    text: "Смотрим, чем этот лот отличается от предыдущего — плотностью, влажностью, потенциалом.",
  },
  {
    n: "03",
    title: "Профиль",
    text: "Строим профиль обжарки под конкретный лот, а не берём готовый шаблон.",
  },
  {
    n: "04",
    title: "Обжарка",
    text: "Останавливаемся не на заданном времени, а в точке, где раскрывается характер зерна.",
  },
  {
    n: "05",
    title: "Каппинг",
    text: "Дегустируем каждую партию, чтобы проверить, действительно ли чашка раскрылась.",
  },
  {
    n: "06",
    title: "Коррекция",
    text: "Если чашка не убедила — профиль пересматривается, и обжарка повторяется.",
  },
  {
    n: "07",
    title: "Раскрытие",
    text: "В чашке остаются сладость, кислотность и терруар — а не вкус самой обжарки.",
  },
] as const;

export default function Approach() {
  return (
    <section id="approach" className="px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-2xl sm:p-8 md:rounded-3xl md:p-12 lg:p-16">
        <div className="mb-8 max-w-2xl sm:mb-10">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-dark">
            Подход
          </span>
          <h2 className="mt-4 font-display text-3xl font-semibold text-burgundy sm:text-4xl md:text-5xl">
            Мы не против тёмной обжарки.
            <br />
            Мы против обжарки по шаблону.
          </h2>
          <p className="mt-4 leading-relaxed text-text/70">
            Один профиль нельзя одинаково хорошо применить ко всем лотам. Pure
            Roast — это то, как мы ищем профиль для каждого лота отдельно, а
            не единая «правильная» степень обжарки.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-4">
          {PROCESS_STEPS.map((step) => (
            <div
              key={step.n}
              className="rounded-xl border border-border bg-cream-dark/60 p-5 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-accent/30 hover:shadow-xl sm:p-6"
            >
              <span className="font-display text-sm font-semibold text-gold-dark">
                {step.n}
              </span>
              <h3 className="mt-2 font-display text-lg font-semibold text-burgundy">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-text/70">
                {step.text}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-8 max-w-2xl font-display text-lg italic leading-relaxed text-burgundy sm:mt-10 sm:text-xl">
          «Мы не выбираем степень обжарки заранее. Мы ищем точку, в которой
          конкретный лот раскрывается лучше всего».
        </p>
      </div>
    </section>
  );
}
