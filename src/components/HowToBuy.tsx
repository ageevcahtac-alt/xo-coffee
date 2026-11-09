import { landingContent } from "@/src/data/landing";

/** «Как купить» — три утверждённых шага. Сроков доставки нет: только что
 *  сроки зависят от выбранной службы. */
export default function HowToBuy() {
  return (
    <section
      aria-label="Как купить"
      className="px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10"
    >
      <div className="mx-auto max-w-7xl rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-8 md:rounded-3xl md:p-12 lg:p-16">
        <ol className="grid gap-5 md:grid-cols-3 md:gap-6">
          {landingContent.howToBuy.steps.map((step, index) => (
            <li
              key={step.title}
              className="border border-border bg-cream-dark/60 p-5 sm:p-6"
            >
              <span
                aria-hidden="true"
                className="font-display text-lg font-semibold text-gold-dark"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-2 font-display text-xl font-semibold text-burgundy">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-text/70">
                {step.text}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
