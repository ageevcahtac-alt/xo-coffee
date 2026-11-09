import { landingContent } from "@/src/data/landing";

/** Институциональный блок «О нас» — без имён, лиц и фото людей. */
export default function AboutBlock() {
  return (
    <section
      aria-label="О нас"
      className="px-4 py-8 sm:px-6 sm:py-10 md:px-8 md:py-12"
    >
      <p className="mx-auto max-w-2xl text-center font-display text-2xl font-semibold leading-snug text-burgundy sm:text-3xl">
        {landingContent.about.text}
      </p>
    </section>
  );
}
