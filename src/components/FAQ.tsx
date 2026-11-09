import { landingContent } from "@/src/data/landing";

/** FAQ — нативный <details>/<summary>: доступен с клавиатуры из коробки
 *  (Enter/Space раскрывают), без JS и без CLS (контент резервируется в
 *  потоке раскрытием, а не абсолютным позиционированием). */
export default function FAQ() {
  return (
    <section
      id="faq"
      aria-label="Частые вопросы"
      className="px-4 pb-8 pt-2 sm:px-6 sm:pb-10 md:px-8 md:pb-12"
    >
      <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-8 md:rounded-3xl">
        {landingContent.faq.items.map((item) => (
          <details key={item.q} className="group border-b border-border last:border-b-0">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left font-display text-lg font-semibold text-burgundy transition-colors hover:text-accent [&::-webkit-details-marker]:hidden">
              {item.q}
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
                className="shrink-0 text-gold-dark transition-transform duration-200 group-open:rotate-180"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </summary>
            <p className="pb-5 pr-8 text-sm leading-relaxed text-text/70 sm:text-base">
              {item.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
