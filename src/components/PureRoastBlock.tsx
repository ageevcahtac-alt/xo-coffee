import { landingContent } from "@/src/data/landing";

/** Блок Pure Roast. Носит id="approach" — пункт «Подход» в навигации
 *  (шапка/подвал не тронуты) ведёт сюда. */
export default function PureRoastBlock() {
  return (
    <section
      id="approach"
      aria-label="Pure Roast"
      className="scroll-mt-36 px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10 lg:scroll-mt-24"
    >
      <div className="mx-auto max-w-7xl rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-8 md:rounded-3xl md:p-12 lg:p-16">
        <h2 className="max-w-3xl font-display text-3xl font-semibold text-burgundy sm:text-4xl md:text-5xl">
          {landingContent.pureRoast.title}
        </h2>
        <p className="mt-4 max-w-3xl leading-relaxed text-text/70 sm:text-lg">
          {landingContent.pureRoast.text}
        </p>
      </div>
    </section>
  );
}
