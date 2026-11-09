"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/src/context/CartContext";
import { NAV_LINKS } from "@/src/lib/nav";
import MobileMenu from "@/src/components/MobileMenu";

const PASSPORT_URL = "https://coffeepassport.ru";

const passportIcon = (
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
);

const passportLinkClassName =
  "flex items-center justify-center gap-1.5 border border-gold/40 text-xs font-medium uppercase tracking-[0.12em] text-gold transition-colors hover:border-gold";

/** Desktop: sits in the header row between the logo and the nav.
 *  Mobile: a thin second row inside the same header — full width, centered,
 *  ~36px tall, same calm ghost (thin outline, no fill). */
function CoffeePassportLink({ className = "" }: { className?: string }) {
  return (
    <a
      href={PASSPORT_URL}
      target="_blank"
      rel="noopener"
      aria-label="Coffee Passport — паспорт зерна"
      className={`${passportLinkClassName} ${className}`}
    >
      {passportIcon}
      Coffee Passport
    </a>
  );
}

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
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <Link href="/#top" className="flex min-w-0 flex-1 items-center lg:flex-none">
          {/* The PNG wordmark is ~8.9:1 — below lg it takes the row's
              leftover width (burger 44 + gap 16 + insets), capped at 65vw;
              on desktop it gets the full 44px burger height instead */}
          <Image
            src="/logo.png"
            alt="XO COFFEE"
            width={6084}
            height={684}
            priority
            className="block h-auto max-w-[65vw] w-full lg:h-11 lg:w-auto lg:max-w-none"
          />
        </Link>

        <CoffeePassportLink className="hidden self-center px-3.5 py-2 lg:inline-flex" />

        <nav
          aria-label="Основная навигация"
          className="hidden items-center gap-10 lg:flex"
        >
          {/* Корзина lives in the menus (here on desktop, the burger's menu
              on mobile) — the header has no cart icon */}
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

        {/* The burger is where the cart lives now (menu → «Корзина»), so the
            fly-to-cart dot lands on it */}
        <button
          ref={registerCartIcon}
          type="button"
          aria-label="Меню"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
          className="flex h-11 w-11 shrink-0 items-center justify-center border border-cream/20 text-cream transition-transform active:scale-90 hover:border-gold/50 hover:text-gold lg:hidden"
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

      {/* Mobile-only second row: the passport link leaves the icon row, so
          the first row is just logo + burger */}
      <div className="mx-auto max-w-7xl px-4 pb-3 sm:px-6 lg:hidden">
        <CoffeePassportLink className="h-9 w-full" />
      </div>

      <MobileMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
    </header>
  );
}
