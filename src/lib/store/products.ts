/**
 * SERVER-ONLY. Never import from a "use client" file.
 *
 * Store Product domain layer — the one place that is allowed to (a) read/
 * write `public.products` (see supabase/migrations/20260912120000_store_products_foundation.sql)
 * and (b) decide whether a `passport_public_id` a caller hands in is real,
 * by delegating to P24's src/lib/integrations/coffeePassportClient.ts.
 *
 * This exists so a future Admin Panel (not built in this phase — see
 * P25_STORE_PRODUCT_DOMAIN_READINESS.md §4) never talks to Supabase or to
 * Coffee Passport directly: it calls a server action/route, which calls the
 * functions here, which are the only code that touches either. No admin
 * auth, no UI, no auto-sync is added by this file — it only makes the next
 * layer possible to build without duplicating integration or DB logic.
 *
 * Never copies Canonical Lot data (flavor profile, cup notes, sensory,
 * farm, producer, green lot, roast batch, roast/taste profile) into
 * `products` — the only link kept is the opaque `passport_public_id`
 * string. See P21/P22 reports for why.
 */

import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import {
  fetchXoRoasterLots,
  type CoffeePassportLot,
} from "@/src/lib/integrations/coffeePassportClient";

export type StoreProduct = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  published: boolean;
  passportPublicId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StoreProductError =
  | { kind: "invalid_input"; detail: string }
  /** Covers every P24 failure that means "no trustworthy answer from
   *  Coffee Passport right now" — missing config, 401, 403, and
   *  network/5xx unavailability. A caller here does not need the P23
   *  HTTP-level distinction, only "could not validate, try again later
   *  or check server configuration". */
  | { kind: "passport_unavailable" }
  /** Coffee Passport answered, but not with the shape this Store expects. */
  | { kind: "passport_invalid_contract"; detail: string }
  | { kind: "lot_not_found"; publicId: string }
  /** A Postgres unique-constraint violation (today: only `products.slug` —
   *  see P22, `passport_public_id` is deliberately NOT unique). */
  | { kind: "conflict"; detail: string }
  /** Any Supabase/Postgres failure, including "no live project configured
   *  yet" (createSupabaseServerClient() throws in that case) — collapsed
   *  into one bucket rather than distinguished, matching the exact
   *  category list P25 asked for, no more. */
  | { kind: "database_error" };

export type StoreProductResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: StoreProductError };

const PRODUCTS_TABLE = "products";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Raw shape of a `public.products` row, exactly as Postgres/Supabase name
 *  the columns (snake_case) — kept separate from the camelCase `StoreProduct`
 *  domain type below, which is this codebase's usual convention (see
 *  src/types/lot.ts's `qScore`, `altitudeMasl`) for its own data, as opposed
 *  to P24's coffeePassportClient.ts, which keeps its field names verbatim
 *  because that shape is an external contract this repo doesn't own. */
type StoreProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  published: boolean;
  passport_public_id: string | null;
  created_at: string;
  updated_at: string;
};

/** Same manual-validation house style as src/lib/coffeePassport.ts and P24's
 *  coffeePassportClient.ts — no schema library exists in this project, and
 *  one row shape doesn't warrant introducing one. Guards against a schema
 *  drift silently producing malformed StoreProduct objects. */
function isStoreProductRow(value: unknown): value is StoreProductRow {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    isNonEmptyString(row.id) &&
    isNonEmptyString(row.slug) &&
    isNonEmptyString(row.name) &&
    (row.description === null || typeof row.description === "string") &&
    typeof row.price === "number" &&
    typeof row.published === "boolean" &&
    (row.passport_public_id === null || typeof row.passport_public_id === "string") &&
    isNonEmptyString(row.created_at) &&
    isNonEmptyString(row.updated_at)
  );
}

function toStoreProduct(row: StoreProductRow): StoreProduct {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    price: row.price,
    published: row.published,
    passportPublicId: row.passport_public_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Maps a P24 CoffeePassportLotsResult failure onto this layer's narrower
 *  error vocabulary — see the StoreProductError.passport_unavailable
 *  comment for why the P23 HTTP-level detail is deliberately not kept. */
function toPassportError(
  error: Extract<
    Awaited<ReturnType<typeof fetchXoRoasterLots>>,
    { ok: false }
  >["error"],
): StoreProductError {
  if (error.kind === "invalid_contract") {
    return { kind: "passport_invalid_contract", detail: error.detail };
  }
  return { kind: "passport_unavailable" };
}

/**
 * Confirms `publicId` is one of XO COFFEE Roasting's currently active
 * Canonical Lots, per Coffee Passport's P23 endpoint — never trusts a
 * `passport_public_id` a caller (eventually: an admin UI) hands in just
 * because it looks well-formed. Returns the matched Lot (display fields
 * only — see CoffeePassportLot) on success; callers must not persist any
 * field from it beyond `public_id` itself (see module comment).
 */
export async function validateXoPassportLot(
  publicId: string,
): Promise<StoreProductResult<CoffeePassportLot>> {
  if (!isNonEmptyString(publicId)) {
    return {
      ok: false,
      error: { kind: "invalid_input", detail: "publicId must be a non-empty string" },
    };
  }

  const lotsResult = await fetchXoRoasterLots();
  if (!lotsResult.ok) {
    return { ok: false, error: toPassportError(lotsResult.error) };
  }

  const match = lotsResult.lots.find((lot) => lot.public_id === publicId);
  if (!match) {
    return { ok: false, error: { kind: "lot_not_found", publicId } };
  }

  return { ok: true, value: match };
}

/**
 * Reads every Store Product, newest first. No filtering by `published` here
 * — this is the future Admin Panel's read path (it must see drafts too),
 * not the public storefront's (which does not use this file — see P25
 * report §12, the customer-facing catalog is untouched).
 */
export async function listStoreProducts(): Promise<StoreProductResult<StoreProduct[]>> {
  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return { ok: false, error: { kind: "database_error" } };
  }

  const { data, error } = await supabase
    .from(PRODUCTS_TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return { ok: false, error: { kind: "database_error" } };
  if (!Array.isArray(data) || !data.every(isStoreProductRow)) {
    return { ok: false, error: { kind: "database_error" } };
  }

  return { ok: true, value: data.map(toStoreProduct) };
}

/**
 * Reads every Store Product referencing a given Canonical Lot. Purely a
 * lookup — it does not block, dedupe, or otherwise enforce anything. Exists
 * so a future Admin UI can show "this Lot already has N Product(s)" before
 * an admin decides whether to add another (e.g. a second commercial weight
 * of the same Lot) — see P22 §7 for why `passport_public_id` is deliberately
 * not unique, and P25 report §"Duplicates" for why this stays advisory.
 */
export async function listStoreProductsByPassportPublicId(
  passportPublicId: string,
): Promise<StoreProductResult<StoreProduct[]>> {
  if (!isNonEmptyString(passportPublicId)) {
    return {
      ok: false,
      error: { kind: "invalid_input", detail: "passportPublicId must be a non-empty string" },
    };
  }

  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return { ok: false, error: { kind: "database_error" } };
  }

  const { data, error } = await supabase
    .from(PRODUCTS_TABLE)
    .select("*")
    .eq("passport_public_id", passportPublicId);

  if (error) return { ok: false, error: { kind: "database_error" } };
  if (!Array.isArray(data) || !data.every(isStoreProductRow)) {
    return { ok: false, error: { kind: "database_error" } };
  }

  return { ok: true, value: data.map(toStoreProduct) };
}

export type CreateStoreProductInput = {
  slug: string;
  name: string;
  description?: string | null;
  price: number;
  /** Required — this function's whole job is "create a Product for a
   *  validated Canonical Lot". A draft Product with no Lot yet (legal per
   *  P22's nullable column) has no domain function in this phase because
   *  none was requested — the column staying nullable in the schema is
   *  enough to keep that door open for later. */
  passportPublicId: string;
};

function validateCreateInput(
  input: CreateStoreProductInput,
): StoreProductError | null {
  if (!isNonEmptyString(input.slug)) {
    return { kind: "invalid_input", detail: "slug must be a non-empty string" };
  }
  if (!isNonEmptyString(input.name)) {
    return { kind: "invalid_input", detail: "name must be a non-empty string" };
  }
  if (
    input.description !== undefined &&
    input.description !== null &&
    typeof input.description !== "string"
  ) {
    return { kind: "invalid_input", detail: "description must be a string or null" };
  }
  if (!Number.isInteger(input.price) || input.price < 0) {
    return { kind: "invalid_input", detail: "price must be a non-negative integer" };
  }
  if (!isNonEmptyString(input.passportPublicId)) {
    return { kind: "invalid_input", detail: "passportPublicId must be a non-empty string" };
  }
  return null;
}

/**
 * Creates a Store Product, but only after confirming `passportPublicId`
 * names a real, currently active XO COFFEE Roasting Canonical Lot — never
 * trusts the value as given, even though it will eventually come from an
 * admin UI that itself only lists real Lots (see module comment, and P25
 * report "IMPORTANT" section: the server re-checks regardless).
 *
 * `published` is not part of the input type and is always written as
 * `false` — adding a Lot to the Store is never the same action as making
 * it visible to customers (see P25 report §11). Publishing is a separate,
 * later action this phase does not build.
 *
 * If the Lot cannot be confirmed, no INSERT is attempted — the Lot-check
 * failure is returned as-is.
 */
export async function createStoreProduct(
  input: CreateStoreProductInput,
): Promise<StoreProductResult<StoreProduct>> {
  const inputError = validateCreateInput(input);
  if (inputError) return { ok: false, error: inputError };

  const lotCheck = await validateXoPassportLot(input.passportPublicId);
  if (!lotCheck.ok) return lotCheck;

  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return { ok: false, error: { kind: "database_error" } };
  }

  const { data, error } = await supabase
    .from(PRODUCTS_TABLE)
    .insert({
      slug: input.slug,
      name: input.name,
      description: input.description ?? null,
      price: input.price,
      published: false,
      passport_public_id: input.passportPublicId,
    })
    .select()
    .single();

  if (error) {
    // Postgres unique_violation — today only products.slug can raise this
    // (passport_public_id has no unique constraint, deliberately — P22 §7).
    if ((error as { code?: string }).code === "23505") {
      return {
        ok: false,
        error: { kind: "conflict", detail: "a product with this slug already exists" },
      };
    }
    return { ok: false, error: { kind: "database_error" } };
  }

  if (!isStoreProductRow(data)) {
    return { ok: false, error: { kind: "database_error" } };
  }

  return { ok: true, value: toStoreProduct(data) };
}
