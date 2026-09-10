export default function Hero() {
  return (
    <section id="top" className="px-4 pt-6 sm:px-6 sm:pt-8 md:px-8 md:pt-10">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-2xl border border-gold/20 bg-backdrop/35 text-cream shadow-2xl backdrop-blur-[10px] md:rounded-3xl">
        <div className="relative flex flex-col items-start px-5 py-12 sm:px-8 sm:py-16 md:px-10 lg:px-14 lg:py-20">
          <span className="mb-4 inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.35em] text-gold">
            <span className="h-px w-8 bg-gold" />
            Метод обжарки Pure Roast
          </span>

          <h1 className="font-display max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            У каждого зерна — своя точка раскрытия.
            <br />
            Мы её находим.
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-cream/80 sm:text-lg">
            Мы не подгоняем разные лоты под один шаблон обжарки. Для каждого
            ищем момент, в котором раскрываются его сладость, кислотность и
            характер происхождения — и останавливаемся именно там.
          </p>

          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:gap-4">
            <a
              href="#catalog"
              className="flex h-12 items-center justify-center bg-gold px-8 text-sm font-semibold uppercase tracking-[0.15em] text-burgundy transition-all duration-300 hover:-translate-y-1.5 hover:bg-gold-dark hover:shadow-xl active:scale-95 sm:h-14 sm:px-10"
            >
              Смотреть каталог
            </a>
            <a
              href="#degustation"
              className="flex h-12 items-center justify-center border border-cream/40 px-8 text-sm font-semibold uppercase tracking-[0.15em] text-cream transition-all duration-300 hover:-translate-y-1.5 hover:border-gold hover:text-gold hover:shadow-xl active:scale-95 sm:h-14 sm:px-10"
            >
              Не знаю, что выбрать
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
