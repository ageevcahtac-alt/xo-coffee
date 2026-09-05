"use client";

import { useEffect, useState } from "react";

export default function FlyingDot({
  from,
  to,
  onDone,
}: {
  from: DOMRect;
  to: DOMRect;
  onDone: () => void;
}) {
  const [style, setStyle] = useState({
    left: `${from.left + from.width / 2 - 6}px`,
    top: `${from.top + from.height / 2 - 6}px`,
    transform: "scale(1)",
    opacity: 1,
  });

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setStyle({
        left: `${to.left + to.width / 2 - 6}px`,
        top: `${to.top + to.height / 2 - 6}px`,
        transform: "scale(0.25)",
        opacity: 0.5,
      });
    });
    return () => cancelAnimationFrame(raf);
    // Fly once from the captured origin to the captured destination.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <span
      onTransitionEnd={onDone}
      style={style}
      className="pointer-events-none fixed z-[80] h-3 w-3 rounded-full bg-gold shadow-[0_0_0_5px_rgba(212,175,55,0.22)] transition-all duration-[650ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
    />
  );
}
