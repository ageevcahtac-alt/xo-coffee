"use client";

import Link from "next/link";
import Drawer from "@/src/components/ui/Drawer";
import { NAV_LINKS } from "@/src/lib/nav";

export default function MobileMenu({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Меню"
      side="right"
      widthClassName="max-w-xs"
    >
      <div className="flex items-center justify-between border-b border-charcoal/15 px-6 py-5">
        <span className="font-display text-lg font-semibold text-burgundy">
          Меню
        </span>
        <button
          type="button"
          aria-label="Закрыть меню"
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-charcoal/15 bg-cream-dark text-lg leading-none text-charcoal/70 shadow-sm transition-all duration-150 active:scale-90 hover:border-burgundy hover:text-burgundy"
        >
          ✕
        </button>
      </div>

      <nav aria-label="Меню" className="flex flex-col gap-3 px-6 py-6">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={onClose}
            className="rounded-lg border border-charcoal/10 bg-cream-dark px-5 py-4 text-center text-sm font-semibold uppercase tracking-[0.12em] text-charcoal/80 shadow-lg transition-all duration-150 active:scale-95 active:border-burgundy active:bg-burgundy active:text-cream hover:border-accent hover:text-burgundy hover:shadow-xl"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </Drawer>
  );
}
