export type LotCategory =
  | "microlot"
  | "espresso"
  | "filter"
  | "specialty-set";

export type BrewSpec = {
  ratio: string;
  tempC: number;
  timeLabel: string;
};

export type FlavorProfile = {
  acidity: number;
  sweetness: number;
  body: number;
  aroma: number;
  finish: number;
};

/**
 * Fields left required are the ones every surface renders unconditionally
 * (a Lot without a country or price isn't really a lot). Fields marked
 * optional here are already treated that way at every call site —
 * `typeof lot.qScore === "number"`, `if (lot.flavorProfile)`,
 * `lot.brew?.[method]`, etc. (see Catalog, LotPassportModal,
 * CoffeePassportDetail, lotPresentation.ts, flavorMatch.ts) — so this just
 * makes the type honest about a contract the code already assumes, rather
 * than asserting completeness the actual data isn't guaranteed to have.
 */
export type Lot = {
  id: string;
  name: string;
  category: LotCategory;
  tags: string[];
  country: string;
  region: string;
  farm?: string;
  altitudeMasl?: number;
  variety?: string;
  process?: string;
  sensory: string[];
  qScore?: number;
  cupNote?: string;
  farmStory?: string;
  flavorProfile?: FlavorProfile;
  price: number;
  brew?: {
    v60?: BrewSpec;
    immersion?: BrewSpec;
    espresso?: BrewSpec;
  };
};
