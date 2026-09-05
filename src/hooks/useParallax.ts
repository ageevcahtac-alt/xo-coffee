"use client";

import { useEffect, useState, type RefObject } from "react";

export function useParallax(
  ref: RefObject<HTMLElement | null>,
  speed = 0.15,
) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;

    const update = () => {
      const el = ref.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const viewportCenter = window.innerHeight / 2;
        const distanceFromCenter = rect.top + rect.height / 2 - viewportCenter;
        setOffset(distanceFromCenter * -speed);
      }
      raf = 0;
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ref, speed]);

  return `translate3d(0, ${offset.toFixed(2)}px, 0)`;
}
