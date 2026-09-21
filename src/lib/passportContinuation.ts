import { getCoffeePassportUrl } from "@/src/lib/coffeePassportLink";
import type { Lot } from "@/src/types/lot";

export type PassportContinuation = {
  headline: string;
  body: string;
  /** Why signing in on Coffee Passport is worth it — shown as-is, never a wall. */
  benefits: string[];
  ctaLabel: string;
  /** The existing Canonical Lot in Coffee Passport — never a new record. */
  href: string;
};

/**
 * The next step after the first tasting is saved. The tasting is already
 * stored (nothing here gates or discards it). Store cannot see the buyer's
 * Coffee Passport session (a different origin), so one neutral offer serves
 * everyone: a signed-in buyer simply lands in their own passport, a guest
 * sees why signing in there keeps their history. Null when the lot has no
 * `passportPublicId` — no link is invented.
 */
export function getPassportContinuation(lot: Lot): PassportContinuation | null {
  const href = getCoffeePassportUrl(lot);
  if (!href) return null;
  return {
    headline: "Первичная оценка сохранена",
    body: "Теперь можно продолжить исследовать этот кофе и свои заметки в Coffee Passport.",
    benefits: [
      "сохранять свои исследования",
      "вести историю дегустаций",
      "возвращаться к этому кофе",
      "исследовать другие лоты",
    ],
    ctaLabel: "Продолжить в Coffee Passport",
    href,
  };
}
