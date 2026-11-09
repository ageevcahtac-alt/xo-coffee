/**
 * SERVER-ONLY. Never import this from a "use client" file — it touches the
 * server filesystem and runs only inside getCatalog()
 * (src/lib/store/catalog.ts), never in the browser.
 *
 * The Store's own persistent catalog snapshot: a JSON file on disk
 * mirroring Admin's published-products feed, so a sleeping or crashed
 * Admin degrades the catalog to the last synced data instead of a dead
 * storefront. Zero configuration required — by default the snapshot lives
 * at ./.data/catalog-snapshot.json relative to the server's working
 * directory; on the production VPS (Docker) CATALOG_SNAPSHOT_PATH points
 * it at a mounted volume so it survives container restarts. On Render the
 * disk is ephemeral: the snapshot still works, it is just lost on
 * redeploys, which is acceptable there.
 *
 * Snapshot shape:
 *   active   — the last feed Admin answered with, verbatim;
 *   archived — everything that used to be on the feed but left it
 *              (unpublished/deleted in Admin). Syncing alone never drops
 *              rows: a lot taken off the feed keeps selling from the
 *              snapshot until it is deliberately removed there.
 *   syncedAt — ISO timestamp of the last successful Admin sync.
 */

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  isValidProduct,
  type AdminStoreProduct,
} from "@/src/lib/integrations/adminStoreClient";

export type CatalogSnapshot = {
  syncedAt: string;
  active: AdminStoreProduct[];
  archived: AdminStoreProduct[];
};

const DEFAULT_SNAPSHOT_PATH = "./.data/catalog-snapshot.json";

/** Where the snapshot lives: CATALOG_SNAPSHOT_PATH when it is set to a
 *  non-empty value, the working-directory default otherwise. */
export function resolveSnapshotPath(): string {
  const fromEnv = process.env.CATALOG_SNAPSHOT_PATH?.trim();
  return fromEnv ? fromEnv : DEFAULT_SNAPSHOT_PATH;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Whole-value validation, same philosophy as adminStoreClient.ts: a stored
 *  snapshot that doesn't match the shape is untrusted entirely, never
 *  partially read. */
function isValidSnapshot(value: unknown): value is CatalogSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Record<string, unknown>;
  return (
    isNonEmptyString(snapshot.syncedAt) &&
    Array.isArray(snapshot.active) &&
    snapshot.active.every(isValidProduct) &&
    Array.isArray(snapshot.archived) &&
    snapshot.archived.every(isValidProduct)
  );
}

/**
 * Reads the snapshot. Never throws: a missing file, an unreadable file, or
 * corrupt/invalid JSON content all come back as null (="no snapshot") — a
 * broken snapshot file degrades to the pre-snapshot behavior, never to an
 * error the buyer would see.
 */
export async function readSnapshot(): Promise<CatalogSnapshot | null> {
  try {
    const raw = await readFile(resolveSnapshotPath(), "utf8");
    const value: unknown = JSON.parse(raw);
    return isValidSnapshot(value) ? value : null;
  } catch {
    return null;
  }
}

/**
 * Overwrites the snapshot atomically — a unique tmp file in the same
 * directory, then rename over the target, creating the directory when
 * needed — so a concurrent reader never sees a half-written file. Never
 * throws; false means "nothing was written" and must not be escalated by
 * callers: a snapshot problem must never break a live catalog.
 */
export async function writeSnapshot(snapshot: CatalogSnapshot): Promise<boolean> {
  try {
    const target = resolveSnapshotPath();
    await mkdir(dirname(target), { recursive: true });
    const tmp = `${target}.tmp-${process.pid}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;
    await writeFile(tmp, JSON.stringify(snapshot), "utf8");
    await rename(tmp, target);
    return true;
  } catch {
    return false;
  }
}

/**
 * Builds the next snapshot from the previous one and a fresh Admin feed.
 * Pure. `active` is exactly the current feed; `archived` is the union of
 * the previous active and archived minus anything the feed still carries
 * (matched by product id) — entries only ever move into archived, never
 * get dropped by syncing alone.
 */
export function buildNextSnapshot(
  previous: CatalogSnapshot | null,
  feed: AdminStoreProduct[],
): CatalogSnapshot {
  const currentIds = new Set(feed.map((product) => product.id));
  const kept: AdminStoreProduct[] = [];
  const seen = new Set<string>();
  for (const product of [...(previous?.active ?? []), ...(previous?.archived ?? [])]) {
    if (currentIds.has(product.id) || seen.has(product.id)) continue;
    seen.add(product.id);
    kept.push(product);
  }
  return { syncedAt: new Date().toISOString(), active: feed, archived: kept };
}
