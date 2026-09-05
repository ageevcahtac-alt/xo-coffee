"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type CrossfadePhase = "idle" | "exiting" | "entering";

/**
 * Orchestrates a fade+slide swap of content driven by state that lives
 * outside this hook: call runTransition(commit) instead of setting that
 * state directly, and apply `className` to the content wrapper.
 */
export function useCrossfadeTransition(duration = 300) {
  const [phase, setPhase] = useState<CrossfadePhase>("idle");
  const mountedRef = useRef(true);
  const busyRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const runTransition = useCallback(
    (commit: () => void) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setPhase("exiting");

      window.setTimeout(() => {
        if (!mountedRef.current) return;
        commit();
        setPhase("entering");

        requestAnimationFrame(() => {
          if (!mountedRef.current) return;
          requestAnimationFrame(() => {
            if (mountedRef.current) setPhase("idle");
            busyRef.current = false;
          });
        });
      }, duration);
    },
    [duration],
  );

  const className =
    phase === "exiting"
      ? "opacity-0 -translate-x-4"
      : phase === "entering"
        ? "opacity-0 translate-x-4"
        : "opacity-100 translate-x-0";

  return { runTransition, className, phase };
}
