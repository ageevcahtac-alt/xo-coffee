/**
 * A synchronous single-flight guard for the "Подтвердить заказ" submit.
 * React state (`submitting`) only updates on the next render, so a fast
 * double click or a second Enter can slip a second submit in first; this flag
 * flips immediately. Keep one per checkout in a ref.
 */
export function createSubmitLock() {
  let busy = false;
  return {
    /** Runs `task` unless one is already in flight; resolves `undefined` then. */
    async run<T>(task: () => Promise<T>): Promise<T | undefined> {
      if (busy) return undefined;
      busy = true;
      try {
        return await task();
      } finally {
        busy = false;
      }
    },
  };
}
