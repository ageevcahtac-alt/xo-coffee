"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type DiscoveryContextValue = {
  isOpen: boolean;
  openDiscovery: () => void;
  closeDiscovery: () => void;
};

const DiscoveryContext = createContext<DiscoveryContextValue | null>(null);

// Deliberately client-only, in-memory state — no account, no backend, no
// persistence across reloads. Answers/results live inside DiscoveryModal
// itself so re-opening mid-session doesn't force the quiz to restart.
export function DiscoveryProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  // Stable across renders: useDialogFocus's Escape handling depends on
  // onClose's identity (see CartContext for the full reasoning), so an
  // unstable closeDiscovery would retrigger that effect on every unrelated
  // DiscoveryProvider re-render.
  const openDiscovery = useCallback(() => setIsOpen(true), []);
  const closeDiscovery = useCallback(() => setIsOpen(false), []);

  const value = useMemo(
    () => ({ isOpen, openDiscovery, closeDiscovery }),
    [isOpen, openDiscovery, closeDiscovery],
  );

  return <DiscoveryContext.Provider value={value}>{children}</DiscoveryContext.Provider>;
}

export function useDiscovery() {
  const ctx = useContext(DiscoveryContext);
  if (!ctx) throw new Error("useDiscovery must be used within a DiscoveryProvider");
  return ctx;
}
