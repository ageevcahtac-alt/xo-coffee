import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildNextSnapshot,
  readSnapshot,
  resolveSnapshotPath,
  writeSnapshot,
} from "@/src/lib/store/catalogSnapshot";
import type { AdminStoreProduct } from "@/src/lib/integrations/adminStoreClient";

let dir: string;
let file: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "xo-catalog-snapshot-"));
  file = join(dir, "snapshot.json");
  vi.stubEnv("CATALOG_SNAPSHOT_PATH", file);
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(dir, { recursive: true, force: true });
});

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
  description: "Описание B",
  price: 1500,
  passport_public_id: "pp_b",
  updated_at: "2026-11-09T10:00:00.000Z",
  variants: [{ id: "v-b", weight_grams: 250, price: 1500, available_for_order: true }],
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

describe("buildNextSnapshot", () => {
  it("first sync: active is the whole feed, archived is empty", () => {
    const next = buildNextSnapshot(null, [lotA, lotB]);
    expect(next.active).toEqual([lotA, lotB]);
    expect(next.archived).toEqual([]);
    expect(Number.isNaN(Date.parse(next.syncedAt))).toBe(false);
  });

  it("a lot missing from the feed moves to archived instead of being dropped", () => {
    const previous = buildNextSnapshot(null, [lotA, lotB]);
    const next = buildNextSnapshot(previous, [lotA]);
    expect(next.active).toEqual([lotA]);
    expect(next.archived).toEqual([lotB]);
  });

  it("keeps previously archived lots archived across later syncs", () => {
    const previous = buildNextSnapshot(buildNextSnapshot(null, [lotA, lotB]), [lotA]);
    const next = buildNextSnapshot(previous, [lotA]);
    expect(next.archived).toEqual([lotB]);
  });

  it("a lot returning to the feed moves back to active and leaves archived", () => {
    const previous = buildNextSnapshot(buildNextSnapshot(null, [lotA, lotB]), [lotA]);
    const next = buildNextSnapshot(previous, [lotA, lotB]);
    expect(next.active).toEqual([lotA, lotB]);
    expect(next.archived).toEqual([]);
  });

  it("dedupes by id when one id sits in both previous active and archived", () => {
    const previous = {
      syncedAt: "2026-11-09T09:00:00.000Z",
      active: [lotB],
      archived: [lotB, lotC],
    };
    const next = buildNextSnapshot(previous, [lotA]);
    expect(next.active).toEqual([lotA]);
    expect(next.archived).toEqual([lotB, lotC]);
  });
});

describe("resolveSnapshotPath", () => {
  it("defaults to ./.data/catalog-snapshot.json without env", () => {
    vi.stubEnv("CATALOG_SNAPSHOT_PATH", "");
    expect(resolveSnapshotPath()).toBe("./.data/catalog-snapshot.json");
  });

  it("ignores a whitespace-only env value", () => {
    vi.stubEnv("CATALOG_SNAPSHOT_PATH", "   ");
    expect(resolveSnapshotPath()).toBe("./.data/catalog-snapshot.json");
  });

  it("uses CATALOG_SNAPSHOT_PATH when set", () => {
    expect(resolveSnapshotPath()).toBe(file);
  });
});

describe("readSnapshot / writeSnapshot on a real file", () => {
  it("writes and reads back the exact value", async () => {
    const snapshot = { syncedAt: "2026-11-09T10:00:00.000Z", active: [lotA], archived: [lotC] };
    expect(await writeSnapshot(snapshot)).toBe(true);
    expect(await readSnapshot()).toEqual(snapshot);
  });

  it("creates missing directories atomically — no tmp files left behind", async () => {
    const nested = join(dir, "nested", "deeper", "snapshot.json");
    vi.stubEnv("CATALOG_SNAPSHOT_PATH", nested);
    const snapshot = { syncedAt: "2026-11-09T10:00:00.000Z", active: [lotA], archived: [lotC] };

    expect(await writeSnapshot(snapshot)).toBe(true);
    expect(await readSnapshot()).toEqual(snapshot);
    expect(await readdir(join(dir, "nested", "deeper"))).toEqual(["snapshot.json"]);
  });

  it("returns null when the file does not exist", async () => {
    expect(await readSnapshot()).toBeNull();
  });

  it("returns null on corrupt JSON — no throw", async () => {
    await writeFile(file, "{ this is not json");
    expect(await readSnapshot()).toBeNull();
  });

  it.each([
    ["not an object", JSON.stringify("garbage")],
    ["missing syncedAt", JSON.stringify({ active: [], archived: [] })],
    [
      "non-array active",
      JSON.stringify({ syncedAt: "2026-11-09T10:00:00.000Z", active: "x", archived: [] }),
    ],
    [
      "an entry that fails the product contract",
      JSON.stringify({ syncedAt: "2026-11-09T10:00:00.000Z", active: [{ id: 7 }], archived: [] }),
    ],
  ])("reads %s as no snapshot (null), never partially", async (_label, stored) => {
    await writeFile(file, stored);
    expect(await readSnapshot()).toBeNull();
  });

  it("writeSnapshot returns false when the directory cannot be created", async () => {
    const blocker = join(dir, "blocker");
    await writeFile(blocker, "occupied");
    vi.stubEnv("CATALOG_SNAPSHOT_PATH", join(blocker, "snapshot.json"));

    expect(
      await writeSnapshot({ syncedAt: "2026-11-09T10:00:00.000Z", active: [], archived: [] }),
    ).toBe(false);
  });
});
