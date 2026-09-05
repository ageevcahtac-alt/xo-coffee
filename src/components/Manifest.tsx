const PRINCIPLES = [
  {
    title: "Зерно важнее обжарки",
    text: "Мы не сжигаем недостатки — мы отбираем лоты, которым нечего скрывать.",
  },
  {
    title: "Профиль под каждый лот",
    text: "Один рецепт обжарки на всё — это компромисс. Мы на него не идём.",
  },
  {
    title: "Прозрачность до зерна",
    text: "Происхождение, высота, обработка — всё указано, ничего не додумано.",
  },
];

export default function Manifest() {
  return (
    <section id="manifest" className="px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10">
      <div className="paper-grain mx-auto max-w-7xl overflow-hidden rounded-2xl border border-gold/25 bg-cream/82 text-charcoal shadow-2xl backdrop-blur-md md:rounded-3xl">
        <div className="relative mx-auto max-w-5xl px-5 py-12 text-center sm:px-8 sm:py-16 md:px-10 lg:py-20">
          <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gold-dark">
            Манифест
          </span>

          <h2 className="mx-auto mt-6 max-w-3xl font-display text-3xl font-semibold leading-tight text-burgundy sm:text-4xl md:text-5xl lg:text-6xl">
            Мы боремся за вкус
          </h2>

          <p className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-charcoal/70 sm:text-lg">
            Против пережаренного зерна, которое всё на одно лицо. Против
            обжарки, которая прячет брак вместо того, чтобы раскрывать
            происхождение. Вкус — это то, ради чего кофе вообще существует.
          </p>

          <div className="mx-auto mt-10 grid gap-5 sm:mt-16 sm:gap-6 md:grid-cols-3">
            {PRINCIPLES.map((principle) => (
              <div
                key={principle.title}
                className="rounded-xl border border-gold/30 bg-burgundy-dark p-6 text-left text-cream shadow-sm transition-all duration-300 ease-out hover:-translate-y-2.5 hover:border-gold/50 hover:bg-burgundy hover:shadow-2xl sm:p-8"
              >
                <h3 className="font-display text-lg font-semibold text-gold">
                  {principle.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-cream/75">
                  {principle.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
