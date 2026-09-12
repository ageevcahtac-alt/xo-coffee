# P17 — Lot ID Audit & Coffee Passport `public.lots.public_id` Mapping Check

## 1. Исходный commit

`351c933` — "P14: connect XO COFFEE with Coffee Passport" (последний коммит перед этой сессией; working tree был чистым, единственная ветка — `master`, синхронизирована с `origin/master`).

## 2. Задача этого шага

Первый шаг исходного промта P17: аудит текущего Lot ID и проверка, сопоставим ли он (mapping) с колонкой `public.lots.public_id` из Coffee Passport, **без предположения, что идентификаторы совпадают, без использования `orderNumber` в качестве suede-замены, и без создания mapping без подтверждённого источника.**

Ниже — честный результат, а не gap-filling.

---

## 3. Что такое `public.lots.public_id` в этом репозитории

Проверено построчным поиском (`grep -rn "public_id"` по всему репозиторию, исключая `node_modules`): единственное место, где `public.lots.public_id` вообще определён, — миграция

```
supabase/migrations/20260911120000_coffee_passport_foundation.sql
```

написанная в P14 (`b316403`). Заголовок файла прямо говорит о её статусе:

> `-- Status: DESIGNED, NOT APPLIED. There is no live Supabase project connected to this repository`

Определение таблицы (строки 238–251):

```sql
create table if not exists public.lots (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  coffee_id uuid not null references public.coffees (id) on delete restrict,
  ...
);
```

`public_id` — `text not null unique`, **без `default`**: значение должно предоставляться приложением при вставке, генератор (nanoid/slug-алгоритм/последовательность) нигде в репозитории не определён и не задокументирован. По аналогичной колонке на `public.coffees` есть явный комментарий (строки 163–164):

> `'Immutable, globally unique, safe for public URLs. Never reused, never derived from name ... Distinct from id (internal uuid) per P14''s explicit "not a slug" requirement.'`

То есть `public_id` по дизайну — **не slug** и не человеко-читаемый идентификатор, а непрозрачный, никогда не производный от имени/цены/других полей идентификатор.

---

## 4. Существует ли живая таблица `public.lots` для сопоставления

Нет. Проверено:

```
$ node -e "console.log(/NEXT_PUBLIC_SUPABASE_URL=\S/.test(require('fs').readFileSync('.env','utf8')))"
false
$ node -e "console.log(/NEXT_PUBLIC_SUPABASE_ANON_KEY=\S/.test(require('fs').readFileSync('.env','utf8')))"
false
```

`.env` не содержит `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — то же самое подтверждает `.env.example`:

> `# NOT YET CONNECTED: there is no live Supabase project for this repository.`

`src/lib/supabase/client.ts` и `server.ts` явно бросают исключение, если эти переменные не заданы, и оба файла нигде не импортируются ни одним route/компонентом (`grep -rln "supabase" src/` → только сами эти два файла и `src/types/domain.ts`).

Прямой запрос к таблице `lots` (`.from("lots")` / `.from('lots')`) не встречается нигде в `src/` — ни одного репозитория/квери-слоя для Coffee Passport не написано.

**Вывод: `public.lots` — это только SQL-текст миграции, которая никогда не выполнялась. Живых строк, живого `public_id`, с которым можно было бы что-либо сопоставлять, не существует.**

---

## 5. Текущий Lot ID в D2C-сайте

Используется `Lot.id` (`src/types/lot.ts`), hand-assigned slug. Проверено программно:

```
$ node -e "const lots=require('./src/data/lots.json'); const ids=lots.map(l=>l.id);
console.log(JSON.stringify(ids)); console.log('count:',ids.length);
console.log('all unique:', new Set(ids).size===ids.length);
console.log('all url-safe slugs:', ids.every(id=>/^[a-z0-9-]+$/.test(id)));"

["lot-014","lot-027","lot-031","lot-042","lot-056","espresso-nol","espresso-ugol","specialty-degustation"]
count: 8
all unique: true
all url-safe slugs: true
```

Это тот же результат, что и в P14 (раздел 3 `P14_XO_COFFEE_COFFEE_PASSPORT_INTEGRATION.md`) — ничего не изменилось с тех пор, изменений в `lots.json` в этой сессии не вносилось.

`Lot.id` используется как единственный identifier везде на D2C-стороне: React key, `CartItem.id`, `OrderRecordItem.lotId`, `LOTS.find(l => l.id === ...)`.

---

## 6. Почему `Lot.id` и `public_id` — не одно и то же и не подлежат мгновенному mapping'у

| | `Lot.id` (D2C, живой) | `public.lots.public_id` (Coffee Passport, спроектирован) |
|---|---|---|
| Существует ли сейчас | Да, в `src/data/lots.json`, 8 значений | Нет — только колонка в неприменённой миграции |
| Формат по дизайну | Человеко-читаемый slug (`lot-014`, `espresso-nol`) | Явно **не slug**, непрозрачный, "never derived from name" |
| Кто присваивает | Вручную, редактированием `lots.json` | Не определено — нет generator/default в схеме |
| Область действия | Только текущий статический D2C-каталог | Canonical Lot, привязан к `coffee_id`/`green_lot_id`/`roaster_organization_id`, которых у текущих 8 лотов не существует |

Прямого соответствия "один к одному" по имени/формату нет и не может быть проверено, потому что сопоставлять физически не с чем — с одной стороны 8 конкретных строк в JSON, с другой — пустая, никогда не заполнявшаяся таблица.

**Создание mapping (например, JSON-таблицы `{"lot-014": "<какой-то public_id>"}`) на этом шаге означало бы изобретение данных, которых не существует, — это прямо запрещено условием задачи и не будет сделано.**

---

## 7. Об `orderNumber`

`orderNumber` относится исключительно к встроенной, order-scoped Coffee Passport фиче (`/passport/[orderNumber]`, `src/lib/coffeePassport.ts`, `src/types/coffeePassport.ts`) — идентификатору **заказа**, а не лота. Он используется в 11 файлах (`OrderSuccess.tsx`, `PaymentStep.tsx`, `CartDrawer.tsx`, `CoffeePassportDetail.tsx`, `CoffeePassportPage.tsx`, `MyCoffeePage.tsx`, `coffeePassport.ts`, `coffeePassportLink.ts`, `nav.ts`, `telegram.ts`, `order.ts`), и ни в одном из них нет связи с `public.lots.public_id`.

Использование `orderNumber` как proxy для Lot ID mapping было бы категориальной ошибкой (заказ ≠ лот, и один заказ может содержать несколько лотов — `OrderPayloadItem[]`). Не использовалось и не будет использоваться для этой цели.

---

## 8. Итог по шагу 1 (Lot ID audit / public_id mapping)

- Подтверждённый источник для mapping `Lot.id ↔ public.lots.public_id` **отсутствует**: нет ни живой БД, ни спецификации, ни решения владельца о стратегии присвоения `public_id` существующим 8 лотам.
- Идентификаторы **не** предполагаются совпадающими — они разной природы (slug vs. непрозрачный immutable id) и разного жизненного цикла (существует vs. спроектирован-не-применён).
- `orderNumber` не использовался как замена.
- Mapping не создавался.

**Дальнейшие шаги исходного промта P17, зависящие от реального mapping (перенос/синхронизация Lot ID в Coffee Passport, обратные ссылки и т.п.), заблокированы** до одного из двух событий:

1. появляется живой Supabase-проект, миграция `20260911120000_coffee_passport_foundation.sql` применена, и в `public.lots` есть реальные строки — тогда mapping можно строить по факту (например, one-time backfill script, сопоставляющий `lots.json[].id` с новыми `public_id` по явному решению, кто их присваивает);
2. владелец продукта явно определяет стратегию присвоения `public_id` для существующих 8 D2C-лотов (например: "при первом импорте лота в Coffee Passport `public_id` генерируется заново и D2C `Lot.id` сохраняется отдельно как legacy-поле для обратной совместимости ссылок").

Ни то, ни другое не входит в рамки честного аудита — оба пункта требуют решения, которое не может быть принято агентом без подтверждённого источника.

---

## 9. Validation

Команды, воспроизводящие каждую находку этого отчёта (выполнялись из корня репозитория):

```bash
# 1. Чистое рабочее дерево, единственная ветка
git status
git branch -a
git stash list

# 2. Нет живого Supabase-проекта
node -e "console.log(/NEXT_PUBLIC_SUPABASE_URL=\S/.test(require('fs').readFileSync('.env','utf8')))"
node -e "console.log(/NEXT_PUBLIC_SUPABASE_ANON_KEY=\S/.test(require('fs').readFileSync('.env','utf8')))"

# 3. public_id существует только в неприменённой миграции
grep -rln "public_id" --include="*.ts" --include="*.tsx" --include="*.json" --include="*.sql" . | grep -v node_modules

# 4. Нет ни одного запроса к таблице lots
grep -rln "from(\"lots\")\|from('lots')" src/

# 5. Уникальность и формат текущих Lot.id
node -e "const lots=require('./src/data/lots.json'); const ids=lots.map(l=>l.id);
console.log(JSON.stringify(ids));
console.log('all unique:', new Set(ids).size===ids.length);
console.log('all url-safe slugs:', ids.every(id=>/^[a-z0-9-]+$/.test(id)));"

# 6. orderNumber не связан с lots
grep -rln "orderNumber" src/
```

Результаты всех команд — как приведено в разделах 3–7 выше. Изменений в коде в этой сессии не вносилось (audit-only, как и P13).
