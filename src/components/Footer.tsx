import { NAV_LINKS } from "@/src/lib/nav";

export default function Footer() {
  return (
    <footer className="px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10">
      <div className="paper-grain mx-auto max-w-7xl overflow-hidden rounded-2xl border border-gold/25 bg-cream/82 text-charcoal shadow-2xl backdrop-blur-md md:rounded-3xl">
        <div className="px-5 py-10 sm:px-8 sm:py-12 md:px-10 lg:py-16">
          <div className="grid gap-10 sm:gap-12 md:grid-cols-3">
            <div>
              <span className="font-display text-2xl font-semibold tracking-[0.08em] text-burgundy">
                XO <span className="text-gold-dark">COFFEE</span>
              </span>
              <p className="mt-4 max-w-xs font-display text-xl italic leading-snug text-charcoal/80">
                Важен первый глоток!
              </p>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-charcoal/45">
                Навигация
              </h3>
              <ul className="mt-5 space-y-3">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="text-sm text-charcoal/70 transition-colors hover:text-burgundy"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-charcoal/45">
                Контакты
              </h3>
              <ul className="mt-5 space-y-3 text-sm text-charcoal/70">
                <li>hello@xocoffee.ru</li>
                <li>+7 (900) 000-00-00</li>
                <li>Москва, обжарочный цех</li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-4 border-t border-charcoal/10 pt-8 text-xs text-charcoal/45 sm:mt-16 sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} XO COFFEE. Все права защищены.</span>
            <span className="uppercase tracking-[0.2em]">Pure Roast</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
