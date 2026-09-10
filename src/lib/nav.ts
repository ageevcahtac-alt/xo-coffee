// Root-relative so these still resolve correctly from routes other than "/"
// (e.g. /passport/[orderNumber]) — clicked from "/" itself they still just
// scroll, since only the fragment differs from the current URL.
//
// Deliberately lean (buy / understand / personal), not one entry per
// section that exists:
// - "Манифест" isn't listed separately from "Подход" — both are the same
//   "understand XO COFFEE" intent, and Manifest is already the page's own
//   closing section (right before the footer), reached naturally by
//   scrolling Подход. Two nav entries for one intent reads as clutter, not
//   as more to explore.
// - Discovery ("Подобрать кофе") isn't a nav entry at all — it's a mode of
//   choosing, not a destination, and already has visible contextual entry
//   points (Hero's secondary CTA, the Catalog banner, My Coffee's footer).
export const NAV_LINKS = [
  { label: "Каталог", href: "/#catalog" },
  { label: "Подход", href: "/#approach" },
  { label: "Мой кофе", href: "/passport" },
];
