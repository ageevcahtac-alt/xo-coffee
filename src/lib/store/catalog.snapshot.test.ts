import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCatalog } from "@/src/lib/store/catalog";
import { readSnapshot } from "@/src/lib/store/catalogSnapshot";
import type { AdminStoreProduct } from "@/src/lib/integrations/adminStoreClient";

const SECRET = "test-secret-value-do-not-leak";
const ADMIN_URL = "https://admin.example.test/api/integrations/xo-store/products";

const lotA: AdminStoreProduct = {
  id: "a-1",
  slug: "lot-a",
  name: "Лот A",
  description: null,
  price: 1000,
  passport_public_id: null,
  updated_at: "2026-11-09T10:00:00.000Z",
};

const lotB: AdminStoreProduct = {
  id: "b-2",
  slug: "lot-b",
  name: "Лот B",
  description: null,
  price: 1500,
  passport_public_id: null,
  updated_at: "2026-11-09T10:00:00.000Z",
};

const lotC: AdminStoreProduct = {
  id: "c-3",
  slug: "lot-c",
  name: "Лот C",
  description: null,
  price: 900,
  passport_public_id: null,
  updated_at: "2026-11-09T10:00:00.000Z",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("getCatalog with an on-disk snapshot", () => {
  const fetchMock = vi.fn();
  let dir: string;
  let file: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "xo-catalog-snapshot-test-"));
    file = join(dir, "snapshot.json");
    vi.stubEnv("CATALOG_SNAPSHOT_PATH", file);
    vi.stubEnv("ADMIN_INTEGRATION_URL", ADMIN_URL);
    vi.stubEnv("ADMIN_INTEGRATION_SECRET", SECRET);
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    await rm(dir, { recursive: true, force: true });
  });

  it("(а) live Admin is served as-is and the snapshot file is overwritten", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ products: [lotA, lotB] }));

    const catalog = await getCatalog();

    expect(catalog.status).toBe("ok");
    expect(catalog.lots.map((lot) => lot.id)).toEqual(["a-1", "b-2"]);
    const snapshot = await readSnapshot();
    expect(snapshot?.active).toEqual([lotA, lotB]);
    expect(snapshot?.archived).toEqual([]);
    expect(snapshot && Number.isNaN(Date.parse(snapshot.syncedAt))).toBe(false);
    // the file on disk is valid JSON, written atomically (no tmp leftovers)
    expect(JSON.parse(await readFile(file, "utf8")).active).toHaveLength(2);
    expect(await readdir(dir)).toEqual(["snapshot.json"]);
  });

  it("(в) a lot missing from the feed is archived, not dropped, and keeps being served", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ products: [lotA, lotB] }));
    await getCatalog();

    fetchMock.mockResolvedValue(jsonResponse({ products: [lotA] }));
    await getCatalog();
    expect((await readSnapshot())?.archived).toEqual([lotB]);

    fetchMock.mockResolvedValue(jsonResponse({ error: "down" }, 500));
    const catalog = await getCatalog();
    expect(catalog.status).toBe("ok");
    expect(catalog.lots.map((lot) => lot.id)).toEqual(["a-1", "b-2"]);
  });

  it("(б) a failing Admin serves the snapshot from disk, active + archived", async () => {
    await writeFile(
      file,
      JSON.stringify({
        syncedAt: "2026-11-09T09:00:00.000Z",
        active: [lotA],
        archived: [lotC],
      }),
    );
    fetchMock.mockResolvedValue(jsonResponse({ error: "down" }, 500));

    const catalog = await getCatalog();

    expect(catalog.status).toBe("ok");
    expect(catalog.lots.map((lot) => lot.id)).toEqual(["a-1", "c-3"]);
  });

  it("a valid-but-empty snapshot file is served as an empty catalog, not unavailable", async () => {
    await writeFile(
      file,
      JSON.stringify({ syncedAt: "2026-11-09T09:00:00.000Z", active: [], archived: [] }),
    );
    fetchMock.mockRejectedValue(new TypeError("admin asleep"));

    expect(await getCatalog()).toEqual({ status: "ok", lots: [] });
  });

  it("corrupt JSON in the snapshot file degrades to the previous unavailable, without throwing", async () => {
    await writeFile(file, "{ this is not json");
    fetchMock.mockResolvedValue(jsonResponse({ error: "down" }, 500));

    expect(await getCatalog()).toEqual({ status: "unavailable", lots: [] });
  });

  it("corrupt snapshot + live Admin: the buyer sees Admin, and the file heals on the next write", async () => {
    await writeFile(file, "{ this is not json");
    fetchMock.mockResolvedValue(jsonResponse({ products: [lotA] }));

    const catalog = await getCatalog();

    expect(catalog.status).toBe("ok");
    expect(catalog.lots.map((lot) => lot.id)).toEqual(["a-1"]);
    expect((await readSnapshot())?.active).toEqual([lotA]);
  });

  it("an unwritable snapshot path never breaks a live catalog", async () => {
    const blocker = join(dir, "blocker");
    await writeFile(blocker, "occupied");
    vi.stubEnv("CATALOG_SNAPSHOT_PATH", join(blocker, "snapshot.json"));
    fetchMock.mockResolvedValue(jsonResponse({ products: [lotA] }));

    const catalog = await getCatalog();

    expect(catalog.status).toBe("ok");
    expect(catalog.lots.map((lot) => lot.id)).toEqual(["a-1"]);
    expect(console.warn).toHaveBeenCalledWith("[store-catalog] Catalog snapshot write failed.");
  });

  it("never writes the secret to logs", async () => {
    await writeFile(file, "{ broken");
    fetchMock.mockResolvedValue(jsonResponse({ error: "down" }, 500));
    await getCatalog();
    const logged = JSON.stringify([
      (console.error as ReturnType<typeof vi.fn>).mock.calls,
      (console.warn as ReturnType<typeof vi.fn>).mock.calls,
    ]);
    expect(logged).not.toContain(SECRET);
  });
});
