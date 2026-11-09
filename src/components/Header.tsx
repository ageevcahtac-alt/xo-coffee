"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/src/context/CartContext";
import { NAV_LINKS } from "@/src/lib/nav";
import MobileMenu from "@/src/components/MobileMenu";

const PASSPORT_URL = "https://coffeepassport.ru";

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
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-cream/10 bg-backdrop/90 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-10">
        <Link href="/#top" className="flex shrink-0 items-center">
          {/* h-6 → h-10 across breakpoints keeps the row inside 390px while
              the header itself stays h-20; width follows the 6084:684 ratio */}
          <Image
            src="/logo.png"
            alt="XO COFFEE"
            width={6084}
            height={684}
            priority
            className="h-6 w-auto sm:h-8 lg:h-10"
          />
        </Link>

        <nav
          aria-label="Основная навигация"
          className="hidden items-center gap-10 lg:flex"
        >
          {/* Корзина lives in the menus (here on desktop, the burger below
              on mobile) — the header no longer has a cart icon */}
          <button
            type="button"
            onClick={toggleCart}
            className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.12em] text-cream/75 transition-colors hover:text-gold"
          >
            Корзина
            {totalCount > 0 && (
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[10px] font-semibold text-burgundy transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                  bump ? "scale-125" : "scale-100"
                }`}
              >
                {totalCount}
              </span>
            )}
          </button>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium uppercase tracking-[0.12em] text-cream/75 transition-colors hover:text-gold"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Calm ghost, not a CTA: thin gold outline on the dark header, no
              fill, visually weaker than the logo and the burger */}
          <a
            href={PASSPORT_URL}
            target="_blank"
            rel="noopener"
            aria-label="Coffee Passport — паспорт зерна"
            className="flex items-center gap-1.5 border border-gold/40 px-2 py-2 text-xs font-medium uppercase tracking-[0.12em] text-gold/90 transition-colors hover:border-gold hover:text-gold sm:px-3.5"
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
            <span className="sm:hidden">Паспорт</span>
            <span className="hidden sm:inline">Coffee Passport</span>
          </a>

          {/* The burger is where the cart lives now (menu → «Корзина»), so
              the fly-to-cart dot lands on it */}
          <button
            ref={registerCartIcon}
            type="button"
            aria-label="Меню"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            className="flex h-11 w-11 items-center justify-center border border-cream/20 text-cream transition-transform active:scale-90 hover:border-gold/50 hover:text-gold lg:hidden"
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
