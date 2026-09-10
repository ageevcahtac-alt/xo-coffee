"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

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

  return (
    <DiscoveryContext.Provider
      value={{
        isOpen,
        openDiscovery: () => setIsOpen(true),
        closeDiscovery: () => setIsOpen(false),
      }}
    >
      {children}
    </DiscoveryContext.Provider>
  );
}

export function useDiscovery() {
  const ctx = useContext(DiscoveryContext);
  if (!ctx) throw new Error("useDiscovery must be used within a DiscoveryProvider");
  return ctx;
}
