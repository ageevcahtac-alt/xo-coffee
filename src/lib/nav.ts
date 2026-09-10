// Root-relative so these still resolve correctly from routes other than "/"
// (e.g. /passport/[orderNumber]) — clicked from "/" itself they still just
// scroll, since only the fragment differs from the current URL.
export const NAV_LINKS = [
  { label: "Каталог", href: "/#catalog" },
  { label: "Подход", href: "/#approach" },
  { label: "Манифест", href: "/#manifest" },
];
