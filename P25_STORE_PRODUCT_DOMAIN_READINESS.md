# P25 — Store Product Domain Readiness

## 1. Исходный и итоговый commit

Исходный commit: `2a24215` ("P24: server-side Coffee Passport P23 integration client"). `git status` на входе — рабочее дерево чистое, ветка `master` опережает `origin/master` на 4 коммита (не запушены).

Итоговый commit: см. раздел "Git" в конце — один сфокусированный коммит `P25: prepare store product integration domain`.

---

## 2. Что было проанализировано

Прочитано и проверено заново (не принято на веру из предыдущих отчётов):

1. `src/lib/integrations/coffeePassportClient.ts` — единственная точка выхода к Coffee Passport, `fetchXoRoasterLots()`, 5 типов ошибок, server-only.
2. `supabase/migrations/20260912120000_store_products_foundation.sql` — точная схема `public.products` (столбцы, RLS, отсутствие unique на `passport_public_id` — подтверждено построчным чтением файла заново).
3. Структура `src/lib` — подтверждено: единственные существующие подпапки — `src/lib/supabase/` и `src/lib/integrations/` (после P24); ни одной папки `src/lib/store/` или аналога не существовало до этой сессии.
4. Server-side data access паттерны — единственный существующий пример прямого обращения к внешнему сервису с секретом — `src/lib/telegram.ts` (без БД); паттерн ручной runtime-валидации (`isValidOrderRecord`/`isValidTastingRecord` в `src/lib/coffeePassport.ts`, `isValidLot` в P24) — переиспользован, не переизобретён.
5. `src/lib/supabase/client.ts`/`server.ts` — оба явно бросают исключение без env-конфигурации, ни один не импортируется ни одним route/компонентом (не изменилось с P17/P21).
6. `src/data/lots.json` — 8 записей, не тронуты.
7. Checkout/product код (`CartContext.tsx`, `CheckoutForm.tsx`, `PaymentStep.tsx`, `app/api/order/route.ts`) — не тронуты, не читались повторно построчно (не было необходимости — P25 не касается покупательского flow).
8. `src/lib/coffeePassport.ts` — Store-локальная, order-scoped tasting-фича — подтверждено: не имеет отношения к новому domain-слою, не импортируется им и не импортирует его.
9. `package.json` — подтверждено: `vitest@^3.2.7` уже есть (P24), новых зависимостей для P25 не требуется.
10. Текущие Vitest-тесты — `src/lib/integrations/coffeePassportClient.test.ts` (11 тестов, P24) — использованы как образец стиля (mocking через `vi.mock`/`vi.stubGlobal`, `Result`-based API, никаких исключений наружу).

**Дублирующий клиент не создавался** — единственный вызов Coffee Passport в новом коде идёt через уже существующий `fetchXoRoasterLots()`, повторно не реализован.

---

## 3. Почему Admin UI намеренно НЕ создавался

Прямое указание задания (раздел "ГЛАВНОЕ УТОЧНЕНИЕ АРХИТЕКТУРЫ") — предыдущий P25-план (Merchant Lot Picker/Product Creation UI) отменён явным решением владельца, до того как эта сессия начала работу. P25 в этой редакции — только серверная инфраструктура ("server-side domain layer"), которую будущая Admin Panel сможет вызвать через server action/route, когда появится auth. Ни одного UI-файла, ни одного route, ни одной страницы не создано — подтверждено: `git diff --stat -- src/components src/context app/ src/data` → пусто (раздел 12).

---

## 4. Реализованный server-side domain layer

**Расположение:** `src/lib/store/products.ts` — новая директория `src/lib/store/`, по аналогии с уже существующими `src/lib/supabase/` и `src/lib/integrations/` (единственные две подпапки `src/lib` до этой сессии). Название файла взято прямо из примера в задании — после проверки, что более подходящего существующего места нет: `src/lib/shop.ts` (уже существует, но это узкий helper доставки для checkout, не место для нового domain-слоя, работающего с БД и внешней интеграцией — смешивать их значило бы нарушить однозначную границу, которую сам P25 просит соблюдать).

Файл строго server-only (комментарий в начале файла — та же конвенция, что `src/lib/supabase/server.ts` и P24's `coffeePassportClient.ts`), не импортирует ничего из `cart`/`checkout`/`order`/UI, и не импортируется ими — подтверждено (раздел 10).

---

## 5. Какие функции добавлены

```ts
validateXoPassportLot(publicId: string): Promise<StoreProductResult<CoffeePassportLot>>
listStoreProducts(): Promise<StoreProductResult<StoreProduct[]>>
listStoreProductsByPassportPublicId(passportPublicId: string): Promise<StoreProductResult<StoreProduct[]>>
createStoreProduct(input: CreateStoreProductInput): Promise<StoreProductResult<StoreProduct>>
```

`listStoreProductsByPassportPublicId` — не была явно названа в задании, но требуется разделом "DUPLICATES" ("domain layer должен корректно обнаруживать существующий Product, если это необходимо для будущего Admin UI") — реализована как чисто читающий helper, ничего не блокирует и не дедуплицирует (раздел 11).

---

## 6. Как проверяется Canonical Lot

`validateXoPassportLot(publicId)`:
1. Отклоняет пустой/не-строковый `publicId` до любого сетевого вызова (`invalid_input`).
2. Вызывает `fetchXoRoasterLots()` (P24) — единственный источник списка активных XO Lots.
3. При ошибке P24 — не пробрасывает её HTTP-детали дальше, а сворачивает в два domain-уровня категории (раздел 7).
4. Ищет точное совпадение `lot.public_id === publicId` в списке активных лотов — не по имени, не по региону, не "похожий" лот.
5. Не найден → `lot_not_found`. Найден → возвращает сам объект `CoffeePassportLot` (для возможного отображения будущим UI), но **не для сохранения** ничего, кроме `public_id`, — это явно задокументировано в коде.

`createStoreProduct` вызывает эту же функцию внутри себя — INSERT физически не достижим в коде, если `validateXoPassportLot` вернула `ok: false` (`return lotCheck` — ранний выход до единственного места, где вызывается `supabase.from("products").insert(...)`).

---

## 7. Как P24 используется внутри domain layer

Единственный импорт: `import { fetchXoRoasterLots, type CoffeePassportLot } from "@/src/lib/integrations/coffeePassportClient"`. Domain-слой не обращается к `process.env.COFFEE_PASSPORT_INTEGRATION_*` напрямую нигде — подтверждено тестом (`"never reads the Coffee Passport secret directly"`, читает исходный файл и проверяет отсутствие строк `COFFEE_PASSPORT_INTEGRATION_SECRET`/`process.env`).

Ошибки P24 (`not_configured`/`unauthorized`/`forbidden`/`unavailable`/`invalid_contract`) свёрнуты в две domain-категории (`toPassportError()`):
- `invalid_contract` → `passport_invalid_contract` (P23 ответил, но не той формой);
- всё остальное → `passport_unavailable` (не получили доверенный ответ вообще, по любой причине — конфигурация, авторизация или сеть).

Причина свёртки — задание прямо перечисляет ровно эти категории верхнего уровня ("Passport unavailable" / "Passport invalid contract"), не пять P24-подкатегорий; будущему вызывающему коду (server action) не нужна HTTP-детализация, только "можно ли доверять ответу".

---

## 8. Как защищён `passport_public_id`

- Никогда не читается из клиента напрямую в этом слое — `createStoreProduct`/`validateXoPassportLot` принимают его как обычный аргумент функции, вызываемой только server-side; ответственность будущего вызывающего кода — не пропустить туда неавторизованный ввод, но даже если пропустит, эта функция **всегда** перепроверяет значение против P24 заново (раздел "ВАЖНО" задания — "сервер всё равно обязан повторно проверить").
- INSERT в `products` физически недостижим без предварительного успешного `validateXoPassportLot` (раздел 6).
- Столбец остаётся `text`, nullable, **не unique** — P22-схема не менялась (раздел 13/подтверждено `git diff --stat -- supabase/` → пусто).
- Значение сохраняется в БД ровно таким, каким пришло на вход (`input.passportPublicId`), не переприсваивается из найденного `CoffeePassportLot.public_id` отдельно (они гарантированно равны на этот момент, так как `validateXoPassportLot` ищет точное совпадение) — то есть нет двух источников истины для одного и того же значения внутри одной операции.

---

## 9. Как работает Product creation

```
createStoreProduct(input)
  1. validateCreateInput(input)        — slug/name/price/passportPublicId форма
       ✗ → { ok:false, invalid_input }, ничего дальше не вызывается
  2. validateXoPassportLot(input.passportPublicId)
       ✗ → { ok:false, lot_not_found | passport_unavailable | passport_invalid_contract }
           INSERT НЕ выполняется
  3. createSupabaseServerClient()
       throws (не настроен) → { ok:false, database_error }
  4. supabase.from("products").insert({ ...input, published: false }).select().single()
       error.code === "23505" → { ok:false, conflict }
       другая ошибка          → { ok:false, database_error }
  5. isStoreProductRow(data) не проходит → { ok:false, database_error }
  6. → { ok:true, value: StoreProduct }
```

Ни одного пути, где INSERT выполняется раньше шага 2 — подтверждено и чтением кода, и тестами (`expect(supa.from).not.toHaveBeenCalled()` в тестах на `lot_not_found`/`passport_unavailable`/`passport_invalid_contract`/`invalid_input`).

---

## 10. Почему `published = false`

`CreateStoreProductInput` **структурно не содержит** поля `published` — не "по умолчанию false, если не передано", а физически невозможно передать другое значение через этот тип. Само INSERT-выражение внутри `createStoreProduct` пишет `published: false` буквальной константой, не переменной. Причина, как и в задании: "Добавление Lot в Store ≠ публикация товара" — привязка к Canonical Lot и решение показать товар покупателю должны оставаться двумя разными, явными действиями; второе (`Publish Product`) сознательно не реализовано в этой сессии (нет функции с таким именем нигде в новом коде).

---

## 11. Что происходит с legacy 8 SKU

Ничего. `src/data/lots.json` не читался на предмет изменения, не менялся, не удалялся. Ни один SKU не был передан в `createStoreProduct` — эта функция вообще ни разу не вызвана вне тестов с mocked-зависимостями. Подтверждено: `git diff --stat -- src/data` → пусто.

---

## 12. Security checks

| Проверка (раздел "SECURITY" задания) | Результат |
|---|---|
| `coffeePassportClient.ts` остаётся server-only | Не изменён в этой сессии — 0 diff |
| Integration secret не попадает в client bundle | `grep -rl "COFFEE_PASSPORT_INTEGRATION" .next/static` → 0 совпадений после `next build` |
| Domain layer не импортируется в client component | `grep -rl "createStoreProduct\|listStoreProducts\|validateXoPassportLot" .next/static` → 0 совпадений |
| Нет `NEXT_PUBLIC_*` для integration secret | Не добавлено ни одной новой переменной окружения в этой сессии вообще |
| Нет browser → Coffee Passport | Domain-слой не содержит `"use client"`, не импортирован ни одной страницей/компонентом |
| Нет browser → P23 | Тот же путь — единственный сетевой вызов остаётся внутри P24, вызываемого только отсюда |
| Нет передачи secret в response | `StoreProductResult`/`StoreProductError` не содержат ни одного поля, способного нести секрет — тест 7 подтверждает отсутствие `process.env` в файле |
| Нет localStorage | Файл не содержит обращений к `localStorage`/`window` |
| Нет query parameter с secret | Domain-слой не строит URL вообще — это исключительно ответственность уже проверенного в P24 `coffeePassportClient.ts` |

---

## 13. Tests

Добавлен `src/lib/store/products.test.ts`, тот же `vitest`, что уже стоит в проекте (P24) — новая библиотека не добавлена, ровно по запросу задания. Оба внешних зависимости (`fetchXoRoasterLots`, `createSupabaseServerClient`) замоканы через `vi.mock` — ни один тест не касается ни реального Supabase, ни реального Coffee Passport.

| # | Требование задания | Тест |
|---|---|---|
| 1 | Valid XO Lot → Product creation allowed | `"creates a Product when passportPublicId matches an active XO Lot"` |
| 2 | Unknown Lot → creation rejected | `"rejects creation with lot_not_found..."` |
| 3 | Passport unavailable → creation rejected | `"rejects creation with passport_unavailable..."` (+ отдельный тест на `not_configured`/`unauthorized`/`forbidden`) |
| 4 | Invalid Passport contract → creation rejected | `"rejects creation with passport_invalid_contract..."` |
| 5 | Created Product получает `passport_public_id` из validated input | `"stores passportPublicId exactly as validated..."` |
| 6 | New Product получает `published = false` | `"always inserts published: false..."` |
| 7 | Integration secret не экспонируется client-side | `"never reads the Coffee Passport secret directly..."` |
| 8 | Existing Product handling — без непреднамеренного unique constraint | `"lists more than one Product for the same passportPublicId without deduplication or error"` |

Плюс 3 дополнительных теста: маппинг unique-violation (`23505`) в `conflict`, отклонение невалидного `price` до любого сетевого/БД вызова, явная проверка что все три P24-подкатегории (`not_configured`/`unauthorized`/`forbidden`) сворачиваются в `passport_unavailable`.

**Результат прогона (весь проект, не только новый файл):**

```
$ npx vitest run
 ✓ src/lib/integrations/coffeePassportClient.test.ts (11 tests)
 ✓ src/lib/store/products.test.ts (11 tests)
 Test Files  2 passed (2)
      Tests  22 passed (22)
```

Все 11 P24-тестов по-прежнему проходят без изменений — P25 не трогал P24-код.

---

## 14. tsc

```
$ npx tsc --noEmit
(без вывода — 0 ошибок)
```

## 15. build

```
$ npx next build
✓ Compiled successfully in 27.7s
✓ Generating static pages using 3 workers (6/6)

Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /api/order
├ ○ /passport
└ ƒ /passport/[orderNumber]
```

**Те же 5 маршрутов, что и после P24** — ни одного нового route. `npx eslint src/lib/store` — без предупреждений.

---

## 16. Что намеренно НЕ сделано

Ровно по списку из задания:
- Admin panel / merchant UI / Lot picker / product editor / dashboard — 0 файлов;
- login/auth для администратора — не создан, `ADMIN_PASSWORD` не оживлён, `COFFEE_PASSPORT_INTEGRATION_SECRET` не используется как пароль ни в каком виде;
- автоматическая миграция 8 SKU в `products` — не выполнялась, `createStoreProduct` не вызывался вне тестов;
- изменение `lots.json` — не изменён;
- изменение customer storefront/checkout/routes — 0 diff в `src/components`, `src/context`, `app/`, `src/data`;
- изменение P22-схемы — `supabase/migrations/` не тронута, `passport_public_id` остаётся nullable и не-unique;
- применение старой dormant-миграции — не применялась (её статус не менялся с P22).

---

## 17. Ограничения

- `listStoreProducts`/`createStoreProduct` физически не могут быть проверены против реального Supabase — как и в P22/P24, живого проекта нет; вся корректность подтверждена только против мокированного клиента. Реальное поведение (например, точная форма ошибки Supabase JS SDK при `23505`) должно быть перепроверено, когда появится живой проект.
- `validateXoPassportLot` возвращает весь объект `CoffeePassportLot` (включая `country`/`region`/`variety`/`process`/`q_grade`) как побочный результат успешной проверки — это осознанно (полезно для будущего UI, который захочет показать что выбрано), но требует дисциплины от будущего вызывающего кода: раздел "НЕ КОПИРОВАТЬ CANONICAL DATA" запрещает сохранять что-либо из этого объекта в `products`, кроме `public_id`, и это ограничение зафиксировано только комментарием в коде — TypeScript не может механически это запретить.
- Нет функции для Product-черновика без Lot (`passport_public_id = NULL`, легитимно по P22-схеме) — не реализована, потому что не запрошена; колонка остаётся nullable, так что путь не закрыт архитектурно, просто пока не построен.
- `listStoreProducts`/`listStoreProductsByPassportPublicId` не поддерживают пагинацию — при 8 (или сколь угодно малом) числе товаров это не проблема сегодня, но станет ограничением, если каталог вырастет на порядки, — не решается в этой сессии.

---

## 18. Следующий этап

Как прямо зафиксировано в задании: следующий этап **не про интеграцию**, а про визуальную концепцию XO COFFEE Store — дизайн, цветовая система, типографика, визуальная иерархия, premium/specialty-стилистика. Интеграционный фундамент (P23 → P24 → P25) на этом считается подготовленным для будущей Admin Panel, которая станет отдельным этапом после дизайн-фазы.

---

## Git

```
$ git status  (после коммита)
On branch master
Your branch is ahead of 'origin/master' by 5 commits.
nothing to commit, working tree clean
```

История не переписывалась, push не выполнялся.
