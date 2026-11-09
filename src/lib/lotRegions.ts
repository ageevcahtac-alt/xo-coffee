/**
 * Регион (страна) происхождения лота — единый модуль маппинга «регион → slug
 * латиницей». Используется фильтром «По региону» в каталоге и фото пачек
 * (public/lots/<slug>.png). Чистые функции, без I/O, безопасен и для
 * клиента, и для сервера.
 *
 * Источники региона (по приоритету, решает вызывающий код — см.
 * src/lib/store/catalog.ts):
 *   a) страна Canonical Lot из интеграции Coffee Passport (поле country),
 *      сопоставляется со словарём по названию или алиасу;
 *   b) первое слово названия лота из фида админки.
 * Не определился — лот живёт во «Все лоты» как раньше и не создаёт пустых
 * чипсов в «По региону».
 */

export type LotOrigin = { label: string; slug: string };

type RegionEntry = { label: string; slug: string; aliases: string[] };

/** Словарь известных стран происхождения. `label` — то, что видит покупатель;
 *  `slug` — ключ фильтра и имя файла фото; `aliases` — варианты для
 *  сопоставления с внешними данными (английские названия из Coffee Passport
 *  и т.п.), регистронезависимо. */
const ENTRIES: RegionEntry[] = [
  { label: "Эфиопия", slug: "ethiopia", aliases: ["ethiopia"] },
  { label: "Кения", slug: "kenya", aliases: ["kenya"] },
  { label: "Колумбия", slug: "colombia", aliases: ["colombia"] },
  { label: "Бразилия", slug: "brazil", aliases: ["brazil", "brasil"] },
  { label: "Гватемала", slug: "guatemala", aliases: ["guatemala"] },
  { label: "Коста-Рика", slug: "costa-rica", aliases: ["costa rica", "costarica"] },
  { label: "Руанда", slug: "rwanda", aliases: ["rwanda", "руанда"] },
  { label: "Индонезия", slug: "indonesia", aliases: ["indonesia"] },
  { label: "Перу", slug: "peru", aliases: ["peru"] },
  { label: "Сальвадор", slug: "el-salvador", aliases: ["el salvador", "salvador"] },
  { label: "Гондурас", slug: "honduras", aliases: ["honduras"] },
  { label: "Никарагуа", slug: "nicaragua", aliases: ["nicaragua"] },
  { label: "Панама", slug: "panama", aliases: ["panama"] },
  { label: "Танзания", slug: "tanzania", aliases: ["tanzania"] },
  { label: "Уганда", slug: "uganda", aliases: ["uganda"] },
  { label: "Индия", slug: "india", aliases: ["india"] },
  { label: "Вьетнам", slug: "vietnam", aliases: ["vietnam", "viet nam"] },
  { label: "Йемен", slug: "yemen", aliases: ["yemen"] },
  { label: "Эквадор", slug: "ecuador", aliases: ["ecuador"] },
  { label: "Боливия", slug: "bolivia", aliases: ["bolivia"] },
  { label: "Мексика", slug: "mexico", aliases: ["mexico"] },
  { label: "Бурунди", slug: "burundi", aliases: ["burundi"] },
  { label: "Малави", slug: "malawi", aliases: ["malawi"] },
  { label: "Замбия", slug: "zambia", aliases: ["zambia"] },
  { label: "Конго", slug: "congo", aliases: ["congo", "drc", "кдр"] },
  { label: "Гаити", slug: "haiti", aliases: ["haiti"] },
  { label: "Доминикана", slug: "dominican-republic", aliases: ["dominican republic", "dominicana"] },
];

function cleanToken(token: string): string {
  // Снимаем кавычки/скобки/пунктуацию с краёв токена («Эфиопия», -> эфиопия),
  // внутреннее не трогаем (Коста-Рика сохраняет дефис).
  return token
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .replace(/[^\p{L}\p{N}]+$/u, "");
}

function normalize(value: string): string {
  return cleanToken(value.trim().toLowerCase());
}

function firstToken(value: string): string {
  return cleanToken(value.split(/\s+/)[0] ?? "");
}

function matchEntry(word: string): LotOrigin | null {
  if (!word) return null;
  for (const entry of ENTRIES) {
    if (normalize(entry.label) === word || entry.aliases.includes(word)) {
      return { label: entry.label, slug: entry.slug };
    }
  }
  return null;
}

/** Страна из внешнего источника (Coffee Passport) → регион словаря.
 *  Сначала целиком строка, затем её первое слово. */
export function resolveLotRegion(input: string | null | undefined): LotOrigin | null {
  if (!input) return null;
  const whole = normalize(input);
  return matchEntry(whole) ?? matchEntry(firstToken(whole));
}

/** Первое слово названия лота → регион словаря (регистронезависимо). */
export function regionFromLotName(name: string): LotOrigin | null {
  if (!name || !name.trim()) return null;
  return matchEntry(firstToken(normalize(name)));
}

/** Чипсы «По региону»: только регионы, реально присутствующие в выдаче
 *  (active + archived снимка уже слиты в `lots` вызывающим кодом), без
 *  дублей и без пустых кнопок. Сортировка: по убыванию числа лотов, при
 *  равенстве — по названию (ru). */
export function buildRegionChips(
  lots: { origin?: LotOrigin | null }[],
): (LotOrigin & { count: number })[] {
  const counts = new Map<string, { origin: LotOrigin; count: number }>();
  for (const lot of lots) {
    const origin = lot.origin ?? null;
    if (!origin) continue;
    const current = counts.get(origin.slug);
    if (current) current.count += 1;
    else counts.set(origin.slug, { origin, count: 1 });
  }
  return [...counts.values()]
    .sort(
      (a, b) =>
        b.count - a.count || a.origin.label.localeCompare(b.origin.label, "ru"),
    )
    .map(({ origin, count }) => ({ ...origin, count }));
}

/** Лоты одного региона (по slug). */
export function filterLotsByRegion<T extends { origin?: LotOrigin | null }>(
  lots: T[],
  slug: string,
): T[] {
  return lots.filter((lot) => lot.origin?.slug === slug);
}
