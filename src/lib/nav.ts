// Root-relative so these still resolve correctly from routes other than "/"
// (only the fragment differs from the current URL, so on "/" they scroll).
//
// Deliberately lean (buy / understand), not one entry per section that
// exists:
// - "Подход" points at the Pure Roast block (id="approach") — the
//   methodology story in one place; FAQ, Coffee Passport and the rest are
//   reached by scrolling the page. Two nav entries for one intent reads as
//   clutter, not as more to explore.
// - No local personal-cabinet entries: the former "Мой кофе" page, the
//   tasting diary and the Discovery quiz were removed — the personal layer
//   is the external Coffee Passport (coffeepassport.ru), not a Store route.
export const NAV_LINKS = [
  { label: "Каталог", href: "/#catalog" },
  { label: "Подход", href: "/#approach" },
];
