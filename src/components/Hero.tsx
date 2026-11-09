"use client";

import { landingContent } from "@/src/data/landing";

export default function Hero() {
  const { hero } = landingContent;
  return (
    <section id="top" className="px-4 pt-6 sm:px-6 sm:pt-8 md:px-8 md:pt-10">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-2xl border border-border bg-surface text-text shadow-sm md:rounded-3xl">
        <div className="relative flex flex-col items-start px-5 py-12 sm:px-8 sm:py-16 md:px-10 lg:px-14 lg:py-20">
          <span className="mb-4 whitespace-nowrap text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">
            {hero.badge}
          </span>

          <h1 className="font-display max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight text-burgundy sm:text-5xl lg:text-6xl">
            {hero.title}
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-text/70 sm:text-lg">
            {hero.subtitle}
          </p>

          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:gap-4">
            {/* Якорь к каталогу: offset фиксированной шапки — через scroll-mt
                на секции #catalog (129px мобильная / 81px десктоп) */}
            <a
              href="#catalog"
              className="flex h-12 items-center justify-center bg-accent px-8 text-sm font-semibold uppercase tracking-[0.15em] text-cream transition-all duration-300 hover:-translate-y-1.5 hover:bg-accent-hover hover:shadow-xl active:scale-95 sm:h-14 sm:px-10"
            >
              {hero.cta}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
