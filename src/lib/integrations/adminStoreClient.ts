/**
 * SERVER-ONLY. Never import this from a "use client" file — it reads a
 * server secret and must never end up in a browser bundle.
 *
 * The single, narrow client for Admin Panel's Store-facing products endpoint
 * (`GET .../api/integrations/xo-store/products`) — the only production source
 * of the Store's published catalog. Admin is the product-management /
 * publishing layer; this Store never reads Admin's database and never keeps a
 * copy of Admin's products in its own. Same shape and conventions as
 * coffeePassportClient.ts (typed never-throw results, manual validation,
 * Bearer secret, one full endpoint URL in env).
 */

/** The exact Admin wire contract, snake_case kept verbatim (see
 *  coffeePassportClient.ts for why external contracts are not remapped). */
export type AdminStoreProduct = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  passport_public_id: string | null;
  updated_at: string;
};

export type AdminStoreProductsError =
  /** ADMIN_INTEGRATION_URL / _SECRET missing — server configuration. */
  | { kind: "not_configured" }
  /** Admin answered 401 — the shared secret is missing or wrong. */
  | { kind: "unauthorized" }
  /** Admin answered 403. */
  | { kind: "forbidden" }
  /** Admin answered 503 ("Store integration is not configured" on its side),
   *  another non-2xx status, or was unreachable / timed out (`status` absent). */
  | { kind: "unavailable"; status?: number }
  /** Admin answered 2xx, but not with the `{ products: [...] }` shape this
   *  client requires. Never partially trusted — the whole response is
   *  rejected. */
  | { kind: "invalid_contract"; detail: string };

export type AdminStoreProductsResult =
  | { ok: true; products: AdminStoreProduct[] }
  | { ok: false; error: AdminStoreProductsError };

const REQUEST_TIMEOUT_MS = 8_000;

/** How long Next's server-side data cache may serve one Admin response.
 *  Admin itself sends `Cache-Control: no-store`; this is the Store's own
 *  decision, so a published/unpublished change shows up without a deploy
 *  within this window without hitting Admin on every page view. Only 200
 *  responses are stored by Next, so an auth/availability failure is never
 *  cached. */
export const ADMIN_CATALOG_REVALIDATE_SECONDS = 30;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidProduct(value: unknown): value is AdminStoreProduct {
  if (!value || typeof value !== "object") return false;
  const product = value as Record<string, unknown>;
  return (
    isNonEmptyString(product.id) &&
    isNonEmptyString(product.slug) &&
    isNonEmptyString(product.name) &&
    (product.description === null || typeof product.description === "string") &&
    typeof product.price === "number" &&
    Number.isFinite(product.price) &&
    product.price >= 0 &&
    (product.passport_public_id === null ||
      typeof product.passport_public_id === "string") &&
    isNonEmptyString(product.updated_at)
  );
}

/**
 * Fetches the published products from Admin. Never throws — every failure
 * (missing config, 401/403, unavailability, malformed body) comes back as a
 * typed `{ ok: false, error }`, so a caller can't leak a raw exception,
 * secret, or internal URL to a user-facing surface. A 401/403 is reported as
 * such and is never turned into a fallback catalog here.
 */
export async function fetchAdminPublishedProducts(): Promise<AdminStoreProductsResult> {
  const url = process.env.ADMIN_INTEGRATION_URL;
  const secret = process.env.ADMIN_INTEGRATION_SECRET;

  if (!url || !secret) {
    return { ok: false, error: { kind: "not_configured" } };
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      next: { revalidate: ADMIN_CATALOG_REVALIDATE_SECONDS },
    });
  } catch {
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

  const products =
    body && typeof body === "object" ? (body as { products?: unknown }).products : undefined;
  if (!Array.isArray(products)) {
    return {
      ok: false,
      error: { kind: "invalid_contract", detail: "expected { products: [...] }" },
    };
  }

  if (!products.every(isValidProduct)) {
    return {
      ok: false,
      error: {
        kind: "invalid_contract",
        detail: "one or more entries did not match the expected product shape",
      },
    };
  }

  return { ok: true, products };
}
