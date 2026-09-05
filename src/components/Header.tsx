"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/src/context/CartContext";
import { NAV_LINKS } from "@/src/lib/nav";
import MobileMenu from "@/src/components/MobileMenu";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [bump, setBump] = useState(false);
  const { totalCount, toggleCart, registerCartIcon } = useCart();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setBump(true);
    const timeout = setTimeout(() => setBump(false), 400);
    return () => clearTimeout(timeout);
  }, [totalCount]);

  return (
    <header className="sticky top-0 z-50 border-b border-gold/20 bg-[#0F080A]/80 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-10">
        <a
          href="#top"
          className="font-display text-2xl font-semibold tracking-[0.08em] text-cream"
        >
          XO <span className="text-gold">COFFEE</span>
        </a>

        <nav className="hidden items-center gap-10 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium uppercase tracking-[0.12em] text-cream/75 transition-colors hover:text-gold"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <button
            ref={registerCartIcon}
            type="button"
            aria-label="Корзина"
            onClick={toggleCart}
            className="relative flex h-11 w-11 items-center justify-center border border-cream/20 text-cream transition-all active:scale-90 hover:border-gold/50 hover:text-gold"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M6 8h12l-1 12H7L6 8Z" />
              <path d="M9 8V6a3 3 0 0 1 6 0v2" />
            </svg>
            {totalCount > 0 && (
              <span
                className={`absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[10px] font-semibold text-burgundy transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                  bump ? "scale-125" : "scale-100"
                }`}
              >
                {totalCount}
              </span>
            )}
          </button>

          <button
            type="button"
            aria-label="Меню"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            className="flex h-11 w-11 items-center justify-center border border-cream/20 text-cream transition-transform active:scale-90 hover:border-gold/50 hover:text-gold"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
      </div>

      <MobileMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
    </header>
  );
}
