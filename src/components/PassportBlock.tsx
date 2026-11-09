import { landingContent } from "@/src/data/landing";
import { DEFAULT_COFFEE_PASSPORT_PUBLIC_BASE } from "@/src/lib/coffeePassportLink";

/** Блок Coffee Passport: тёмная плашка, спокойная ghost-CTA на золотой
 *  обводке (как в шапке). База — server-only env, пропсом из page. */
export default function PassportBlock({
  passportBaseUrl,
}: {
  passportBaseUrl?: string;
}) {
  const base =
    passportBaseUrl?.trim().replace(/\/+$/, "") ||
    DEFAULT_COFFEE_PASSPORT_PUBLIC_BASE;

  return (
    <section
      aria-label="Coffee Passport"
      className="px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10"
    >
      <div className="mx-auto max-w-7xl rounded-2xl border border-cream/10 bg-surface-accent p-5 text-cream shadow-sm sm:p-8 md:rounded-3xl md:p-12 lg:p-16">
        <h2 className="font-display text-3xl font-semibold sm:text-4xl md:text-5xl">
          {landingContent.passport.title}
        </h2>
        <p className="mt-4 max-w-3xl leading-relaxed text-cream/75 sm:text-lg">
          {landingContent.passport.text}
        </p>
        <a
          href={base}
          target="_blank"
          rel="noopener"
          className="mt-6 inline-flex items-center gap-1.5 border border-gold/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-gold transition-colors hover:border-gold"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M15 3h6v6" />
            <path d="M10 14 21 3" />
            <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
          </svg>
          {landingContent.passport.cta}
        </a>
      </div>
    </section>
  );
}
