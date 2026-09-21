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
export type AdminStoreVariant = {
  id: string;
  weight_grams: number;
  price: number;
  available_for_order: boolean;
};

export type AdminStoreProduct = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  passport_public_id: string | null;
  updated_at: string;
  /** Absent on feeds that predate packaging variants. */
  variants?: AdminStoreVariant[];
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

function isValidVariant(value: unknown): value is AdminStoreVariant {
  if (!value || typeof value !== "object") return false;
  const variant = value as Record<string, unknown>;
  return (
    isNonEmptyString(variant.id) &&
    typeof variant.weight_grams === "number" &&
    Number.isFinite(variant.weight_grams) &&
    variant.weight_grams > 0 &&
    typeof variant.price === "number" &&
    Number.isFinite(variant.price) &&
    variant.price >= 0 &&
    typeof variant.available_for_order === "boolean"
  );
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
    isNonEmptyString(product.updated_at) &&
    (product.variants === undefined ||
      (Array.isArray(product.variants) && product.variants.every(isValidVariant)))
  );
}

/** Copies variants field by field, so anything else Admin might send (in
 *  particular a stock figure) never enters Store memory, props or the
 *  browser. */
function sanitizeProduct(product: AdminStoreProduct): AdminStoreProduct {
  if (product.variants === undefined) return product;
  return {
    ...product,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      weight_grams: variant.weight_grams,
      price: variant.price,
      available_for_order: variant.available_for_order,
    })),
  };
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

  return { ok: true, products: products.map(sanitizeProduct) };
}

// ---------------------------------------------------------------------------
// Orders — `POST .../api/integrations/xo-store/orders`
// ---------------------------------------------------------------------------

/** The whole order body Store sends. Deliberately nothing but the variant and
 *  the count: Admin looks up price, weight, lot and stock itself. */
export type AdminOrderRequest = {
  customer_name?: string;
  customer_contact?: string;
  items: { variant_id: string; quantity: number }[];
};

export type AdminOrderResult =
  | { ok: true; orderId: string }
  | {
      ok: false;
      /** `rejected`: Admin understood the order and refused it (unknown /
       *  inactive variant, unpublished product) — retrying unchanged won't
       *  help. Everything else is a transient or configuration failure. */
      error: "not_configured" | "unauthorized" | "rejected" | "unavailable" | "invalid_contract";
      /** Admin's own message for `rejected`; safe to log, not to show. */
      detail?: string;
    };

/** The orders endpoint is a sibling of the products endpoint, so it is
 *  derived from the one existing ADMIN_INTEGRATION_URL (`.../products`)
 *  rather than introducing a second env var. Anything that doesn't end in
 *  `/products` is treated as not configured — never guessed. */
export function getAdminOrdersUrl(productsUrl: string | undefined): string | null {
  if (!productsUrl) return null;
  try {
    const url = new URL(productsUrl);
    if (!/\/products\/?$/.test(url.pathname)) return null;
    url.pathname = url.pathname.replace(/\/products\/?$/, "/orders");
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

/** Creates the order in Admin. Never throws; a non-201 is never a success. */
export async function placeAdminOrder(request: AdminOrderRequest): Promise<AdminOrderResult> {
  const url = getAdminOrdersUrl(process.env.ADMIN_INTEGRATION_URL);
  const secret = process.env.ADMIN_INTEGRATION_SECRET;
  if (!url || !secret) return { ok: false, error: "not_configured" };

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: "unavailable" };
  }

  if (response.status === 401 || response.status === 403) {
    return { ok: false, error: "unauthorized" };
  }
  if (response.status === 400 || response.status === 422) {
    let detail: string | undefined;
    try {
      const body = (await response.json()) as { error?: unknown };
      if (typeof body.error === "string") detail = body.error;
    } catch {
      // detail stays undefined
    }
    return { ok: false, error: "rejected", detail };
  }
  if (!response.ok) return { ok: false, error: "unavailable" };

  try {
    const body = (await response.json()) as { order_id?: unknown };
    if (isNonEmptyString(body.order_id)) return { ok: true, orderId: body.order_id };
  } catch {
    // fall through
  }
  return { ok: false, error: "invalid_contract" };
}
