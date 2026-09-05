"use client";

import { useRef } from "react";
import { useParallax } from "@/src/hooks/useParallax";

export default function Hero() {
  const gridRef = useRef<HTMLDivElement>(null);
  const gridTransform = useParallax(gridRef, 0.06);

  return (
    <section id="top" className="px-4 pt-6 sm:px-6 sm:pt-8 md:px-8 md:pt-10">
      <div className="paper-grain relative mx-auto max-w-7xl overflow-hidden rounded-2xl border border-gold/25 bg-cream/82 text-charcoal shadow-2xl backdrop-blur-md md:rounded-3xl">
        <div
          ref={gridRef}
          aria-hidden
          style={{
            transform: gridTransform,
            backgroundImage:
              "radial-gradient(circle at 1px 1px, var(--color-gold) 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
          className="pointer-events-none absolute inset-0 opacity-[0.08] will-change-transform"
        />

        <div className="relative flex flex-col items-start px-5 py-12 sm:px-8 sm:py-16 md:px-10 lg:px-14 lg:py-20">
          <span className="mb-4 inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.35em] text-gold-dark">
            <span className="h-px w-8 bg-gold" />
            Концепция обжарки
          </span>

          <h1 className="font-display text-5xl font-semibold leading-[0.95] tracking-tight text-burgundy sm:text-6xl lg:text-8xl">
            PURE
            <br />
            ROAST
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-charcoal/70 sm:text-lg">
            Мы обжариваем ровно настолько, чтобы раскрыть зерно — и ни секундой
            дольше. Никакой горечи вместо вкуса, никакой обжарки вместо
            терруара. Только то, что вложила земля.
          </p>

          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:gap-4">
            <a
              href="#catalog"
              className="flex h-12 items-center justify-center bg-gold px-8 text-sm font-semibold uppercase tracking-[0.15em] text-burgundy transition-all duration-300 hover:-translate-y-1.5 hover:bg-gold-dark hover:shadow-xl active:scale-95 sm:h-14 sm:px-10"
            >
              Смотреть каталог
            </a>
            <a
              href="#approach"
              className="flex h-12 items-center justify-center border border-burgundy/30 px-8 text-sm font-semibold uppercase tracking-[0.15em] text-burgundy transition-all duration-300 hover:-translate-y-1.5 hover:border-burgundy hover:bg-burgundy hover:text-cream hover:shadow-xl active:scale-95 sm:h-14 sm:px-10"
            >
              В чём подход
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
