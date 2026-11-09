/**
 * SERVER-ONLY. Never import this from a "use client" file — it reads the
 * server filesystem. Async Server Components (page/Footer) call these
 * helpers directly.
 *
 * Манифесты статических ассетов: что реально лежит в public/, чтобы рендерить
 * <Image> только за существующие файлы — без битых img, пустых рамок и
 * onError-костылей. Чтение локального каталога на запрос дешёвое; в пределах
 * одного запроса результат мемоизирован через react cache().
 */

import { cache } from "react";
import { readdir } from "node:fs/promises";
import path from "node:path";

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

/** «ethiopia.png» → ethiopia; терпит и «ethiopia.png.png» (двойное
 *  расширение) → ethiopia. Не-image и невалидные имена → null. */
function slugFromFileName(fileName: string): string | null {
  const lower = fileName.toLowerCase();
  const ext = IMAGE_EXTENSIONS.find((e) => lower.endsWith(e));
  if (!ext) return null;
  let stem = fileName.slice(0, fileName.length - ext.length);
  if (stem.toLowerCase().endsWith(".png")) stem = stem.slice(0, -4);
  const slug = stem.trim().toLowerCase();
  return /^[a-z0-9][a-z0-9-]*$/.test(slug) ? slug : null;
}

/** Фото пачек для drawer: slug региона → публичный путь /lots/<file>.
 *  Один файл на регион; при отсутствии файла региона в маппинге просто нет —
 *  drawer выглядит как раньше, без заглушек. Ошибка чтения каталога = пустой
 *  манифест, никогда не исключение. */
export const getLotImageMap = cache(async (): Promise<Record<string, string>> => {
  try {
    const dir = path.join(process.cwd(), "public", "lots");
    const files = await readdir(dir);
    const map: Record<string, string> = {};
    for (const file of files) {
      const slug = slugFromFileName(file);
      if (slug && !(slug in map)) map[slug] = `/lots/${file}`;
    }
    return map;
  } catch {
    return {};
  }
});

/** Брендовые картинки подвала. Слоган — картинкой, только если файл уже
 *  загружен; иначе подвал оставляет текстовый fallback (см. Footer). */
export const getBrandAssets = cache(
  async (): Promise<{ sloganImage: string | null }> => {
    try {
      const dir = path.join(process.cwd(), "public", "brand");
      const files = await readdir(dir);
      return { sloganImage: files.includes("slogan.png") ? "/brand/slogan.png" : null };
    } catch {
      return { sloganImage: null };
    }
  },
);
