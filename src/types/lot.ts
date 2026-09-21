export type LotCategory =
  | "microlot"
  | "espresso"
  | "filter"
  | "specialty-set";

/** One packaging of a product (Admin's `product_variants`). Its `id` is the
 *  commercial identity of what is sold: cart lines and orders reference the
 *  variant, never a weight or a name. Physical stock is deliberately absent —
 *  Admin does not send it and the Store must never show it. */
export type LotVariant = {
  id: string;
  weightGrams: number;
  price: number;
  availableForOrder: boolean;
};

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
  /** Present on catalog entries sourced from Admin (see
   *  src/lib/store/catalog.ts); absent on the legacy static demo lots. */
  slug?: string;
  description?: string;
  /** Opaque Coffee Passport reference — never dereferenced by the catalog. */
  passportPublicId?: string;
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
  /** Legacy weightless price. Buyers are shown variant prices only (see
   *  src/lib/variants.ts) — a price without a weight is not a real offer. */
  price: number;
  /** Packagings from Admin. `undefined` on the legacy static demo lots; `[]`
   *  on an Admin product that has no packaging yet (nothing to order). */
  variants?: LotVariant[];
  brew?: {
    v60?: BrewSpec;
    immersion?: BrewSpec;
    espresso?: BrewSpec;
  };
};
