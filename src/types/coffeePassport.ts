import type { Lot } from "@/src/types/lot";

/**
 * Coffee Passport is XO's post-purchase, personal tasting layer — what
 * happened to a lot in someone's own cup. It is deliberately a different
 * shape from the professional 5-axis FlavorProfile on Lot (acidity,
 * sweetness, body, aroma, finish, 0-10): MyCupRating is a 1-5 personal
 * impression, and the two are never merged or averaged together.
 *
 * This is a local-only MVP: no account, no backend. These types are the
 * seam a real Coffee Passport service could sit behind later without
 * changing how the rest of the app reads/writes them — only
 * src/lib/coffeePassport.ts's storage functions would need to change.
 */

export type OrderRecordItem = {
  lotId: string;
  name: string;
  quantity: number;
};

// Deliberately minimal — no email, address, payment method or price.
// Just enough to resolve "which lots did this order contain" locally.
export type OrderRecord = {
  orderNumber: string;
  createdAt: string; // ISO date
  items: OrderRecordItem[];
};

export type BrewMethodKey = keyof NonNullable<Lot["brew"]> | "other";

export type MyCupRating = {
  acidity: number;
  sweetness: number;
  body: number;
  overall: number;
};

export type TastingRecord = {
  id: string;
  orderNumber: string;
  lotId: string;
  /** Only meaningful for a multi-origin set (e.g. specialty-degustation):
   *  which character the taster means. Always one of the lot's own
   *  `country` segments — never a fabricated per-character lot id. */
  component?: string;
  brewMethod: BrewMethodKey;
  rating: MyCupRating;
  note: string;
  createdAt: string; // ISO date
};
