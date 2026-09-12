/**
 * SERVER-ONLY. Never import this from a "use client" file or pass its
 * output through a client component prop without deciding first what's
 * actually needed — see fetchXoRoasterLots's return type below.
 *
 * The single, narrow client for Coffee Passport's P23 read-only integration
 * endpoint (`GET .../api/integrations/xo-store/lots`) — the only source of
 * XO COFFEE Roasting's active Canonical Lots. Does not touch cart, checkout,
 * orders, or Product UI, and does not write anything anywhere: Coffee
 * Passport remains the sole owner of Canonical Lot data (see
 * P21_XO_STORE_DATA_ARCHITECTURE_AUDIT.md,
 * P22_XO_STORE_COMMERCIAL_DATA_LAYER_IMPLEMENTATION.md).
 *
 * Named `coffeePassportClient.ts`, not `coffeePassport.ts`, on purpose: this
 * repository already has an unrelated `src/lib/coffeePassport.ts` — XO
 * Store's own local, order-scoped tasting-journal feature (see P20/P21's
 * naming-collision finding). Two files sharing the bare name `coffeePassport.ts`
 * in different folders would recreate exactly that collision in an IDE's
 * quick-open list; the `Client` suffix (matching src/lib/supabase/client.ts's
 * naming logic) makes the two unambiguous at a glance.
 *
 * Not imported by any route or component yet — this is P24's consumption
 * layer only. A merchant-facing picker that calls this is a later phase
 * (see P24 report §15/P25).
 */

/** The exact P23 wire contract, as given — never extended locally. Field
 *  names and casing (snake_case) are kept verbatim from the response, not
 *  remapped to this codebase's usual camelCase, so nothing here can drift
 *  from what P23 actually sends. Deliberately excludes anything P23 does
 *  not document returning: no internal uuid, no roaster uuid, no fields
 *  invented on the Store side. */
export type CoffeePassportLot = {
  public_id: string;
  name: string;
  /** Nullable per the equivalent columns' shape in the (deprecated, never
   *  applied) P14 migration this repo already carries — public.coffees.country/
   *  region and public.green_lots.variety/process/q_score all lack NOT NULL.
   *  Not independently confirmed against P23's actual source (a separate
   *  repository, not available from here) — see P24 report §2. */
  country: string | null;
  region: string | null;
  variety: string | null;
  process: string | null;
  q_grade: number | null;
};

export type CoffeePassportLotsError =
  /** COFFEE_PASSPORT_INTEGRATION_URL / _SECRET missing — a server
   *  configuration problem, not something P23 said. */
  | { kind: "not_configured" }
  /** P23 responded 401 — the shared secret is missing/wrong. */
  | { kind: "unauthorized" }
  /** P23 responded 403 — authenticated identity, but not allowed this call. */
  | { kind: "forbidden" }
  /** P23 unreachable, timed out, or answered with a non-2xx/401/403 status
   *  (5xx, unexpected 4xx, network failure). `status` is absent for a
   *  network-level failure (no response was ever received). */
  | { kind: "unavailable"; status?: number }
  /** P23 answered, but the body isn't the array-of-Lot shape this client
   *  requires. Never partially trusted — the whole response is rejected. */
  | { kind: "invalid_contract"; detail: string };

export type CoffeePassportLotsResult =
  | { ok: true; lots: CoffeePassportLot[] }
  | { ok: false; error: CoffeePassportLotsError };

const REQUEST_TIMEOUT_MS = 8_000;

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

/** Same "validate defensively, drop what doesn't match" discipline as
 *  src/lib/coffeePassport.ts's isValidOrderRecord/isValidTastingRecord — this
 *  codebase's existing house style for untrusted data, reused here rather
 *  than pulling in a schema-validation library for one small shape. */
function isValidLot(value: unknown): value is CoffeePassportLot {
  if (!value || typeof value !== "object") return false;
  const lot = value as Record<string, unknown>;
  return (
    typeof lot.public_id === "string" &&
    lot.public_id.length > 0 &&
    typeof lot.name === "string" &&
    isNullableString(lot.country) &&
    isNullableString(lot.region) &&
    isNullableString(lot.variety) &&
    isNullableString(lot.process) &&
    isNullableNumber(lot.q_grade)
  );
}

/**
 * Fetches XO COFFEE Roasting's active Canonical Lots from Coffee Passport's
 * P23 endpoint. Never throws — every failure mode (missing config, auth
 * failure, network/availability failure, malformed response) comes back as
 * a typed `{ ok: false, error }`, so callers can't accidentally leak a raw
 * exception (stack trace, secret, internal URL) to a user-facing surface.
 */
export async function fetchXoRoasterLots(): Promise<CoffeePassportLotsResult> {
  const url = process.env.COFFEE_PASSPORT_INTEGRATION_URL;
  const secret = process.env.COFFEE_PASSPORT_INTEGRATION_SECRET;

  if (!url || !secret) {
    return { ok: false, error: { kind: "not_configured" } };
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    // Network failure, DNS failure, or the timeout above firing — none of
    // these ever reached a P23 response, so there is no status to report.
    return { ok: false, error: { kind: "unavailable" } };
  }

  if (response.status === 401) return { ok: false, error: { kind: "unauthorized" } };
  if (response.status === 403) return { ok: false, error: { kind: "forbidden" } };
  if (!response.ok) {
    return { ok: false, error: { kind: "unavailable", status: response.status } };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return {
      ok: false,
      error: { kind: "invalid_contract", detail: "response body was not valid JSON" },
    };
  }

  if (!Array.isArray(body)) {
    return {
      ok: false,
      error: { kind: "invalid_contract", detail: "expected a JSON array of lots" },
    };
  }

  if (!body.every(isValidLot)) {
    return {
      ok: false,
      error: {
        kind: "invalid_contract",
        detail: "one or more entries did not match the expected Lot shape",
      },
    };
  }

  return { ok: true, lots: body };
}
