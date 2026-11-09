import Image from "next/image";
import Link from "next/link";
import { NAV_LINKS } from "@/src/lib/nav";
import { getBrandAssets } from "@/src/lib/serverAssets";

export default async function Footer() {
  // Серверный манифест: слоган картинкой показываем только если файл уже
  // загружен (public/brand/slogan.png); иначе — текстовый fallback, битых
  // img не бывает.
  const { sloganImage } = await getBrandAssets();

  return (
    <footer className="px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-2xl border border-cream/10 bg-surface-accent text-cream shadow-2xl md:rounded-3xl">
        <div className="px-5 py-10 sm:px-8 sm:py-12 md:px-10 lg:py-16">
          <div className="grid gap-10 sm:gap-12 md:grid-cols-3">
            <div>
              {/* Тот же логотип, что в шапке — без разнобоя шрифтов; чуть
                  меньше шапочного (32px против 44px на десктопе) */}
              <Image
                src="/logo.png"
                alt="XO COFFEE"
                width={6084}
                height={684}
                className="h-7 w-auto sm:h-8"
              />
              {sloganImage ? (
                <Image
                  src={sloganImage}
                  alt="Важен первый глоток!"
                  width={2139}
                  height={639}
                  className="mt-4 h-auto w-full"
                />
              ) : (
                <p className="mt-4 max-w-xs font-display text-xl italic leading-snug text-cream/85">
                  Важен первый глоток!
                </p>
              )}
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-cream/50">
                Навигация
              </h3>
              <ul className="mt-5 space-y-3">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-cream/75 transition-colors hover:text-gold"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-cream/50">
                Контакты
              </h3>
              <ul className="mt-5 space-y-3 text-sm text-cream/75">
                <li>hello@xocoffee.ru</li>
                <li>+7 (900) 000-00-00</li>
                <li>Всеволожск, обжарочный цех</li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-4 border-t border-cream/10 pt-8 text-xs text-cream/50 sm:mt-16 sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} XO COFFEE. Все права защищены.</span>
            <span className="uppercase tracking-[0.2em]">Pure Roast</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
