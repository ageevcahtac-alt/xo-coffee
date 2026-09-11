/**
 * P14 foundation domain types — mirror
 * supabase/migrations/20260911120000_coffee_passport_foundation.sql by hand.
 *
 * Hand-written, not generated: there is no live Supabase project to run
 * `supabase gen types typescript` against yet (see
 * P14_COFFEE_PASSPORT_ARCHITECTURE_FOUNDATION.md). Once a real project
 * exists and the migration is applied, regenerate this file from the
 * database instead of maintaining it by hand.
 *
 * These are new, separate types — they do NOT replace or alter
 * `src/types/lot.ts`'s existing `Lot` type, which remains the type for the
 * current static-JSON D2C catalog and is untouched by this phase. See the
 * migration map in the P14 report for how the two relate.
 */

export type OrganizationRole = "roaster" | "cafe";

export type Profile = {
  id: string; // uuid, references auth.users.id
  createdAt: string;
  updatedAt: string;
};

export type Organization = {
  id: string; // uuid
  publicId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationMember = {
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  createdAt: string;
};

/** Canonical Coffee entity — the top of the Roaster -> Coffee chain. */
export type Coffee = {
  id: string; // uuid
  publicId: string;
  roasterOrganizationId: string;
  name: string;
  country: string | null;
  region: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * A specific green-coffee batch tied to a Coffee. Fields mirror exactly
 * what the existing flat `Lot` type (src/types/lot.ts) already tracks about
 * the raw bean, before roasting — nothing invented beyond that.
 */
export type GreenLot = {
  id: string; // uuid
  publicId: string;
  coffeeId: string;
  roasterOrganizationId: string;
  farm: string | null;
  farmStory: string | null;
  variety: string | null;
  process: string | null;
  altitudeMasl: number | null;
  qScore: number | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Canonical Lot — the central Coffee Passport source of truth. Owned
 * exclusively by the Roaster organization that created it. There is
 * deliberately only this one lot type — no CafeLot/ShadowLot/GuestLot.
 */
export type CanonicalLot = {
  id: string; // uuid
  publicId: string;
  coffeeId: string;
  greenLotId: string;
  roasterOrganizationId: string;
  name: string;
  category: string | null;
  tags: string[];
  priceCents: number | null;
  /** Same shape as the existing Lot["brew"] — how to prepare it, not a
   *  roast-process fact, so it lives here rather than on the roast profile. */
  brew: {
    v60?: { ratio: string; tempC: number; timeLabel: string };
    immersion?: { ratio: string; tempC: number; timeLabel: string };
    espresso?: { ratio: string; tempC: number; timeLabel: string };
  } | null;
  createdAt: string;
  updatedAt: string;
};

/** A specific roasting run of a Canonical Lot. A Lot can have many. */
export type RoastBatch = {
  id: string; // uuid
  publicId: string;
  lotId: string;
  roasterOrganizationId: string;
  batchCode: string | null;
  roastedAt: string | null; // date
  createdAt: string;
  updatedAt: string;
};

/**
 * Versioned, append-only roast reference data for a Canonical Lot.
 * Deliberately thin today — see migration comment §7 for why `data` is a
 * catch-all jsonb rather than named columns: the current product has no
 * confirmed roast-technical fields to model yet.
 */
export type ReferenceRoastProfile = {
  id: string; // uuid
  lotId: string;
  version: number;
  isCurrent: boolean;
  notes: string | null;
  data: Record<string, unknown>;
  createdAt: string;
  createdBy: string | null;
};

/**
 * Versioned, append-only reference taste data for a Canonical Lot. Mirrors
 * the existing 5-axis FlavorProfile (src/types/lot.ts) plus sensory notes
 * and cup note. NOT the same thing as an individual/guest tasting snapshot
 * (MyCupRating in src/types/coffeePassport.ts) — that distinction is
 * intentional and unchanged by this phase.
 */
export type ReferenceTasteProfile = {
  id: string; // uuid
  lotId: string;
  version: number;
  isCurrent: boolean;
  acidity: number | null;
  sweetness: number | null;
  body: number | null;
  aroma: number | null;
  finish: number | null;
  sensory: string[];
  cupNote: string | null;
  createdAt: string;
  createdBy: string | null;
};
