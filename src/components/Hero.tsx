"use client";

import { useDiscovery } from "@/src/context/DiscoveryContext";

export default function Hero() {
  const { openDiscovery } = useDiscovery();

  return (
    <section id="top" className="px-4 pt-6 sm:px-6 sm:pt-8 md:px-8 md:pt-10">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-2xl border border-border bg-surface text-text shadow-2xl md:rounded-3xl">
        <div className="relative flex flex-col items-start px-5 py-12 sm:px-8 sm:py-16 md:px-10 lg:px-14 lg:py-20">
          <span className="mb-4 inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.25em] text-gold-dark">
            <span className="h-px w-8 bg-gold" />
            Метод обжарки Pure Roast
          </span>

          <h1 className="font-display max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight text-burgundy sm:text-5xl lg:text-6xl">
            У каждого зерна — своя точка раскрытия.
            <br />
            Мы её находим.
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-text/70 sm:text-lg">
            Мы не подгоняем разные лоты под один шаблон обжарки. Для каждого
            ищем момент, в котором раскрываются его сладость, кислотность и
            характер происхождения — и останавливаемся именно там.
          </p>

          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:gap-4">
            <a
              href="#catalog"
              className="flex h-12 items-center justify-center bg-accent px-8 text-sm font-semibold uppercase tracking-[0.15em] text-cream transition-all duration-300 hover:-translate-y-1.5 hover:bg-accent-hover hover:shadow-xl active:scale-95 sm:h-14 sm:px-10"
            >
              Смотреть каталог
            </a>
            <button
              type="button"
              onClick={openDiscovery}
              className="flex h-12 items-center justify-center border border-border px-8 text-sm font-semibold uppercase tracking-[0.15em] text-burgundy transition-all duration-300 hover:-translate-y-1.5 hover:border-accent hover:bg-accent-surface hover:shadow-xl active:scale-95 sm:h-14 sm:px-10"
            >
              Не знаю, что выбрать
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
