/**
 * SERVER-ONLY. Never import from a "use client" file.
 *
 * The Store's customer-facing catalog. Production source: Admin Panel's
 * published products (src/lib/integrations/adminStoreClient.ts). Nothing here
 * is persisted — there is no Store-side copy of Admin's products.
 *
 * The only fallback is the legacy static demo catalog, and only when Admin is
 * *not configured at all* outside production (local development). A
 * configured-but-failing Admin (401/403/5xx/malformed) is never masked by a
 * fallback, in any environment.
 */

import {
  fetchAdminPublishedProducts,
  type AdminStoreProduct,
} from "@/src/lib/integrations/adminStoreClient";
import { LOTS as LEGACY_DEMO_LOTS } from "@/src/data/lots";
import type { Lot } from "@/src/types/lot";

export type Catalog = {
  /** "unavailable" = the catalog could not be loaded (show an error state);
   *  "ok" with `lots: []` is a valid, empty catalog. */
  status: "ok" | "unavailable";
  lots: Lot[];
};

/** Admin's contract carries no origin/flavor/category data, so those fields
 *  get neutral values and the existing UI already treats them as optional.
 *  `category` is required by Lot; "microlot" is only a neutral default. */
export function mapAdminProductToLot(product: AdminStoreProduct): Lot {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    ...(product.description ? { description: product.description } : {}),
    ...(product.passport_public_id
      ? { passportPublicId: product.passport_public_id }
      : {}),
    price: product.price,
    category: "microlot",
    tags: [],
    country: "",
    region: "",
    sensory: [],
  };
}

export async function getCatalog(): Promise<Catalog> {
  const result = await fetchAdminPublishedProducts();

  if (result.ok) {
    return { status: "ok", lots: result.products.map(mapAdminProductToLot) };
  }

  if (result.error.kind === "not_configured" && process.env.NODE_ENV !== "production") {
    console.warn(
      "[store-catalog] Admin integration is not configured — serving the DEV-ONLY static demo catalog.",
    );
    return { status: "ok", lots: LEGACY_DEMO_LOTS };
  }

  const { error } = result;
  console.error(
    "[store-catalog] Could not load the catalog from Admin:",
    error.kind === "unavailable" && error.status !== undefined
      ? `${error.kind} (HTTP ${error.status})`
      : error.kind === "invalid_contract"
        ? `${error.kind} (${error.detail})`
        : error.kind,
  );
  return { status: "unavailable", lots: [] };
}
