"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Lot } from "@/src/types/lot";

export type CatalogState = {
  status: "ok" | "unavailable";
  lots: Lot[];
};

const CatalogContext = createContext<CatalogState | null>(null);

/** Receives the catalog already loaded on the server (see app/layout.tsx) —
 *  the browser never talks to Admin and never sees the integration secret. */
export function CatalogProvider({
  catalog,
  children,
}: {
  catalog: CatalogState;
  children: ReactNode;
}) {
  return <CatalogContext.Provider value={catalog}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogState {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used within a CatalogProvider");
  return ctx;
}
