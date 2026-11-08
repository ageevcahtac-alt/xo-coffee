// Root-relative so these still resolve correctly from routes other than "/"
// (only the fragment differs from the current URL, so on "/" they scroll).
//
// Deliberately lean (buy / understand), not one entry per section that
// exists:
// - "Манифест" isn't listed separately from "Подход" — both are the same
//   "understand XO COFFEE" intent, and Manifest is already the page's own
//   closing section (right before the footer), reached naturally by
//   scrolling Подход. Two nav entries for one intent reads as clutter, not
//   as more to explore.
// - No local personal-cabinet entries: the former "Мой кофе" page, the
//   tasting diary and the Discovery quiz were removed — the personal layer
//   is the external Coffee Passport (coffeepassport.ru), not a Store route.
export const NAV_LINKS = [
  { label: "Каталог", href: "/#catalog" },
  { label: "Подход", href: "/#approach" },
];
