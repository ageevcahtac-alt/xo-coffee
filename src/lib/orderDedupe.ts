/**
 * SERVER-ONLY. Minimal protection against one submit creating two Admin
 * orders (double click that got past the client, a retried request, a refresh
 * mid-send). Deliberately not a distributed idempotency system: it lives in
 * this server instance's memory, and Admin has no idempotency key to lean on.
 *
 * Same order number + same cart signature => the same in-flight or already
 * confirmed result is returned instead of running the work again. A failed
 * result is dropped at once, so the buyer can always retry.
 */

type Entry = { signature: string; result: Promise<unknown>; expiresAt: number };

const entries = new Map<string, Entry>();
const TTL_MS = 10 * 60_000;

export async function runOnce<T>(
  key: string,
  signature: string,
  work: () => Promise<T>,
  isConfirmed: (result: T) => boolean,
): Promise<T> {
  const now = Date.now();
  for (const [k, entry] of entries) {
    if (entry.expiresAt <= now) entries.delete(k);
  }

  const existing = entries.get(key);
  if (existing && existing.signature === signature) {
    return existing.result as Promise<T>;
  }

  const result = work();
  const entry: Entry = { signature, result, expiresAt: now + TTL_MS };
  entries.set(key, entry);
  const forget = () => {
    if (entries.get(key) === entry) entries.delete(key);
  };
  result.then((value) => {
    if (!isConfirmed(value)) forget();
  }, forget);
  return result;
}

/** Test helper. */
export function resetOrderDedupe() {
  entries.clear();
}
