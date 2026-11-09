import { landingContent } from "@/src/data/landing";

/** Полоса доверия под hero: одна строка-лентa, на мобильном аккуратно
 *  переносится (flex-wrap). Разделитель — золотая точка, скрыта от скринридеров. */
export default function TrustBar() {
  return (
    <section aria-label="Полоса доверия" className="mt-4 px-4 sm:mt-6 sm:px-6 md:px-8">
      <div className="mx-auto max-w-7xl rounded-2xl border border-cream/10 bg-surface-accent px-5 py-4 text-center shadow-sm md:rounded-3xl">
        <ul className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm font-medium text-cream/85">
          {landingContent.trustBar.map((item, index) => (
            <li key={item} className="flex items-center gap-3">
              {index > 0 && (
                <span aria-hidden="true" className="text-gold">
                  ·
                </span>
              )}
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
