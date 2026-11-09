/**
 * SERVER-ONLY. Never import from a "use client" file.
 *
 * The Store's customer-facing catalog. Live source: Admin Panel's published
 * products (src/lib/integrations/adminStoreClient.ts), mirrored best-effort
 * into the persistent on-disk snapshot
 * (src/lib/store/catalogSnapshot.ts). When Admin is unreachable, the
 * catalog is served from that snapshot — active plus archived — so a
 * sleeping or crashed Admin degrades to possibly-stale data instead of a
 * dead storefront. Syncing never removes snapshot rows on its own: a lot
 * unpublished in Admin keeps selling from the snapshot until it is removed
 * there, so real stock can be flushed instead of the listing vanishing
 * mid-sale.
 *
 * The snapshot is a cache, not a source of truth — Admin stays the
 * publisher, and the only Store-side persistence is this one JSON file.
 *
 * The only non-snapshot fallback is the legacy static demo catalog, and only
 * when Admin is *not configured at all* outside production (local
 * development). A configured-but-failing Admin (401/403/5xx/malformed) is
 * never masked by the demo catalog, in any environment.
 */

import {
  fetchAdminPublishedProducts,
  type AdminStoreProduct,
} from "@/src/lib/integrations/adminStoreClient";
import {
  buildNextSnapshot,
  readSnapshot,
  writeSnapshot,
} from "@/src/lib/store/catalogSnapshot";
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
    variants: (product.variants ?? [])
      .map((variant) => ({
        id: variant.id,
        weightGrams: variant.weight_grams,
        price: variant.price,
        availableForOrder: variant.available_for_order,
      }))
      .sort((a, b) => a.weightGrams - b.weightGrams),
    category: "microlot",
    tags: [],
    country: "",
    region: "",
    sensory: [],
  };
}

/** Best-effort mirror of a fresh Admin feed into the snapshot. Never throws
 *  and never changes the response: while Admin is reachable, the buyer sees
 *  Admin's data regardless of what happens to the snapshot file on the way. */
async function syncSnapshot(products: AdminStoreProduct[]): Promise<void> {
  try {
    const previous = await readSnapshot();
    const written = await writeSnapshot(buildNextSnapshot(previous, products));
    if (!written) {
      console.warn("[store-catalog] Catalog snapshot write failed.");
    }
  } catch {
    // Snapshot sync is auxiliary — a bug here must never break a live catalog.
  }
}

export async function getCatalog(): Promise<Catalog> {
  const result = await fetchAdminPublishedProducts();

  if (result.ok) {
    await syncSnapshot(result.products);
    return { status: "ok", lots: result.products.map(mapAdminProductToLot) };
  }

  const snapshot = await readSnapshot();
  if (snapshot) {
    // Only reachable when Admin failed. A valid-but-empty snapshot is served
    // truthfully as an empty catalog ("Admin had published nothing as of
    // syncedAt"), not as an outage.
    console.error(
      `[store-catalog] Admin unavailable — serving catalog snapshot synced at ${snapshot.syncedAt} (${snapshot.active.length} active, ${snapshot.archived.length} archived).`,
    );
    return {
      status: "ok",
      lots: [...snapshot.active, ...snapshot.archived].map(mapAdminProductToLot),
    };
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
