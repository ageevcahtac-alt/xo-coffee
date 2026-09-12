# P21 — XO COFFEE Store Data Architecture & Shadow Lot Elimination Audit

## 0. Исходный commit и метод

Исходный commit: `f4421de` — "P17: Lot ID audit and Coffee Passport public.lots.public_id mapping check". Рабочее дерево на входе — чистое, ветка `master` опережает `origin/master` на 1 коммит (сам коммит P17, не запушен). Проверено `git status` до начала работы.

Аудит проведён построчным чтением файлов и `grep` по всему репозиторию (`src/`, `app/`, `supabase/`, конфигам). Код не менялся — это audit-only шаг, как P13 и P17.

---

## 1. Executive Summary

XO Store сегодня — это статический Next.js D2C-сайт **без единой строки в базе данных**. Каталог — это `src/data/lots.json` (8 записей), загруженный в память при сборке. Корзина и заказы живут только в браузере (`localStorage`) плюс одноразовое Telegram-уведомление при чекауте; сервер ничего не сохраняет.

Единственный артефакт, похожий на "базу данных Store", — это неприменённая Supabase-миграция `20260911120000_coffee_passport_foundation.sql` из P14. Она **не** описывает коммерческий Store data layer — она описывает полноценную вторую систему Canonical Lot (organizations → coffees → green_lots → **lots** → roast_batches → reference_*_profiles), т.е. именно то, чем, согласно P20/P21, должен владеть исключительно Coffee Passport. Это главный найденный риск: **shadow Canonical Lot система уже сидит в репозитории Store, просто ещё не применена.**

Дополнительно подтверждена P20-находка про naming collision: локальная, полностью самодостаточная (order-scoped, localStorage-only) фича "Coffee Passport" существует в этом репозитории с P5–P6, задолго до реальной внешней платформы, и её название используется в 25 файлах, включая пользовательский `<title>` `"Coffee Passport — XO COFFEE"` на `/passport/[orderNumber]`.

Ниже — полный аудит текущего состояния, решение KEEP/REWORK/REMOVE по старой миграции, рекомендуемая модель `Product`, и точный, но нереализуемый в этой сессии план P22.

---

## 2. Current Store Architecture

| | |
|---|---|
| Framework | Next.js 16.3.4 (App Router), React 19.2.8 |
| package.json name | `xo-coffee-pureroast` |
| Данные | 100% статические (`src/data/lots.json`, встроен в билд) |
| БД | Отсутствует. Ни одного подключения к живой БД. |
| Auth | Отсутствует. Нет ни одного файла auth-логики. |
| Admin | Отсутствует в коде. Есть только "осиротевшая" переменная `ADMIN_PASSWORD` в `.env`/`render.yaml` — **не используется ни в одном файле `src/`/`app/`** (проверено `grep -rl ADMIN_PASSWORD *.ts`, 0 совпадений). Похоже на задел из более ранней фазы, который никогда не был реализован. |
| Merchant / Dashboard | Отсутствует полностью — 0 совпадений по "merchant"/"dashboard" в `src/`/`app/`. |
| Server actions | Отсутствуют — 0 файлов с `"use server"`. |
| API routes | Ровно один: `app/api/order/route.ts` — принимает `OrderPayload`, валидирует обязательные поля и пересылает в Telegram (`sendOrderToTelegram`). Ничего не пишет в БД, ничего не возвращает кроме статуса отправки. |
| Env vars (реально используемые) | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (Telegram-уведомление, опционально — при отсутствии просто лог в консоль сервера) |
| Env vars (задел, не используются) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (P14 foundation, не заданы), `NEXT_PUBLIC_COFFEE_PASSPORT_LOT_URL_TEMPLATE` (P14 bridge, не задана) |
| Env vars (мёртвые) | `ADMIN_PASSWORD` — задан в `render.yaml`/`.env`, не читается кодом нигде |
| Deployment | `render.yaml` → Render.com, `npm run build` / `npm start`, план free, регион Frankfurt |
| Supabase-скаффолдинг | `src/lib/supabase/client.ts` и `server.ts` — оба явно бросают исключение без env-переменных, ни один не импортируется ни одним route/компонентом (см. P17-аудит, не изменилось) |

---

## 3. Current Catalog Data Model

Каталог — это единый плоский тип `Lot` (`src/types/lot.ts`), в котором **коммерческие и канонические поля не разделены**:

```ts
export type Lot = {
  id: string;              // ← единственный identifier, служит и Product ID, и Canonical Lot ref
  name, category, tags, country, region, farm?, altitudeMasl?, variety?,
  process?, sensory, qScore?, cupNote?, farmStory?, flavorProfile?,
  price: number;           // ← коммерческое поле
  brew?: { v60?, immersion?, espresso? };
};
```

Нет полей `published`/`status`/`visibility`, нет `inventory`/`stock`, нет `sku`. Данные читаются один раз при сборке (`src/data/lots.ts`: `export const LOTS: Lot[] = lotsData as Lot[];`) и живут в памяти процесса — никакого динамического CRUD, ни runtime-изменения каталога.

**Вывод: в текущей кодовой базе концепции "Product" (коммерческая сущность магазина) отдельно от "Lot" (происхождение/дегустация) не существует вообще — это одна и та же структура.** Это и есть первопричина, почему интеграция с внешним Coffee Passport требует новой модели, а не просто добавления поля.

---

## 4. Current Lot Model

`Lot.id` — hand-assigned slug (`lot-014`, `espresso-nol`, `specialty-degustation` и т.п.), проверено ранее (P14/P17) программно: 8 значений, все уникальны, все url-safe. Он используется буквально везде как единственный identifier:

- React key в `Catalog.tsx`;
- `CartItem.id` (`CartContext.tsx`);
- `OrderPayloadItem.lotId` (`src/types/order.ts`) — с комментарием в коде **"Canonical Lot identity (see src/types/lot.ts's Lot.id)"** — терминология, унаследованная от P14, которая называет Store-локальный slug "canonical", хотя по новой границе P20/P21 canonical — только `public.lots.public_id` в Coffee Passport;
- `OrderRecordItem.lotId` / `TastingRecord.lotId` (`src/types/coffeePassport.ts`) — локальный passport-журнал резолвит лоты по этому же id;
- `getCoffeePassportUrl(lotId)` (`src/lib/coffeePassportLink.ts`) — см. раздел 7, это ключевая находка.

**Store сегодня не имеет отдельного понятия "Product identity"** — оно склеено с этим же slug.

---

## 5. Existing `lots.json` Usage

8 записей, реальный (не тестовый) контент — актуальный боевой каталог сайта, не заглушки.

Ответы по каждому пункту задания:

| Вопрос | Ответ |
|---|---|
| Коммерческие данные? | Да — `price` внутри того же объекта |
| Canonical Lot identity? | **Нет.** Это Store-локальный hand-assigned slug, не связан ни с какой внешней системой (подтверждено в P14/P17: единственное упоминание `public_id` в репозитории — неприменённая миграция) |
| Display data? | Да — `name`, `farmStory`, `flavorProfile`, `sensory`, `cupNote`, `brew` — всё это происхождение/дегустация, концептуально принадлежит Canonical Lot, а не Product |
| Тестовые данные? | Нет, это живой продакшн-каталог |
| `lotId` используется в заказах? | Да — `OrderPayloadItem.lotId`, `OrderRecordItem.lotId`, прослеживается через весь чекаут в Telegram-payload и в localStorage-passport |
| Используется только для UI? | Нет — используется как ключ идентичности сквозь Cart → Order → Passport, не только для отображения |
| Зависимость checkout от текущего формата? | Да, прямая: `CheckoutForm`/`PaymentStep` строят `OrderPayloadItem` из `CartItem.id`, который равен `lot.id`, без какого-либо промежуточного маппинга |

**IDs вида `lot-014` — это Store product identity, а не Passport ID.** Их нельзя путать с `public.lots.public_id` (см. P17-отчёт) — они разной природы (человеко-читаемый slug vs. непрозрачный immutable identifier).

---

## 6. Existing Database / Migration State

Единственный файл: `supabase/migrations/20260911120000_coffee_passport_foundation.sql` (написан в P14, commit `b316403`). Заголовок честно помечает: **`Status: DESIGNED, NOT APPLIED`** — никогда не выполнялась ни против какой базы, нет живого Supabase-проекта (подтверждено `.env` — нет `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY`).

Полное содержимое (7 таблиц + 1 enum + 2 security-definer функции):

1. `public.profiles` — auth-identity mirror + триггер на `auth.users`
2. `public.organizations` (+ `organization_role` enum `roaster`/`cafe`) + `organization_members`
3. `public.coffees` — `public_id`, `roaster_organization_id`
4. `public.green_lots` — `public_id`, `coffee_id`, происхождение (farm/variety/process/altitude/q_score)
5. **`public.lots`** — `public_id`, `coffee_id`, `green_lot_id`, `roaster_organization_id`, name/category/tags/price_cents/brew
6. `public.roast_batches` — `public_id`, `lot_id`
7. `public.reference_roast_profiles`, `public.reference_taste_profiles` — версионированные append-only справочные данные лота

Все таблицы — с RLS, все политики построены вокруг `is_org_member(roaster_organization_id)` — то есть это модель владения **Roaster-организацией своим Canonical Lot**, один в один то, что, по вводным P20, уже реализовано в самом Coffee Passport (`public.lots.roaster_id`, `roaster.slug = roaster-xo`, `listCanonicalLotsForRoaster()`).

---

## 7. Shadow Canonical Lot Risk

Это центральный риск аудита, и он двойной.

**7.1 — Прямой риск: миграция целиком.** Файл из раздела 6 — это не "фундамент для Store", это полная копия Canonical Lot системы (`organizations → coffees → green_lots → lots → roast_batches → reference_*_profiles`) внутри репозитория Store. Если её когда-нибудь применить как есть, XO Store получит собственную таблицу `public.lots` с собственным `public_id` — то есть ровно вторую систему Canonical Lots, которую параграф 1 задания запрещает. Уже сам P14-отчёт (`P14_XO_COFFEE_COFFEE_PASSPORT_INTEGRATION.md`, п.3 итоговых замечаний) это предвидел: *"Экспериментальный Supabase foundation... остаётся в репозитории... может ввести в заблуждение будущего разработчика, если не удалить его явным, осознанным решением владельца"*. P21 формализует это решение (раздел 13).

**7.2 — Скрытый риск: `coffeePassportLink.ts`.** Функция `getCoffeePassportUrl(lotId: string)` подставляет **Store-локальный `Lot.id`** (`lot-014`) напрямую в `{lotId}`-плейсхолдер шаблона внешней Coffee Passport платформы:

```ts
// src/lib/coffeePassportLink.ts, комментарий к функции:
// `lotId` is the existing `Lot.id` (src/types/lot.ts) — already a stable,
// unique, immutable, URL-safe slug (e.g. "lot-014")... No new identifier
// was invented for this bridge.
```

Сегодня это безопасно, потому что `NEXT_PUBLIC_COFFEE_PASSPORT_LOT_URL_TEMPLATE` не задана и функция возвращает `null` (ссылка не рендерится). **Но сам дизайн функции предполагает, что Store'овский `Lot.id` можно один в один передать во внешнюю платформу как её собственный идентификатор** — это ровно то предположение, которое параграфы 5–6 задания запрещают ("Store-generated Lot ID" как замена Passport identity). Если когда-нибудь эту переменную окружения зададут без предварительного решения о реальном mapping'е, ссылки будут вести на несуществующие/чужие Passport-записи. Это не баг сегодня (функция ничего не делает), но это архитектурный долг, который должен быть закрыт до того, как появится настоящий `passport_public_id` на Product.

---

## 8. Existing Coffee Passport Naming Collision

Подтверждено: локальная фича "Coffee Passport" существует в этом репозитории с P5–P6 (задолго до P13/P14, когда впервые зашла речь о внешней платформе) и упоминается в **25 файлах**:

```
app/passport/page.tsx
app/passport/[orderNumber]/page.tsx
src/components/passport/CoffeePassportPage.tsx
src/components/passport/CoffeePassportDetail.tsx
src/components/passport/MyCoffeePage.tsx
src/components/LotPassportModal.tsx
src/components/CartDrawer.tsx, Catalog.tsx, DiscoveryModal.tsx
src/components/cart/OrderSuccess.tsx, PaymentStep.tsx
src/context/CartContext.tsx
src/hooks/useDialogFocus.ts
src/lib/coffeePassport.ts, coffeePassportLink.ts, discovery.ts,
    flavorMatch.ts, lotPresentation.ts, nav.ts, personalTaste.ts
src/lib/supabase/client.ts, server.ts (комментарии)
src/types/coffeePassport.ts, domain.ts, lot.ts
```

**Что это на самом деле:** order-scoped, localStorage-only, post-purchase дегустационный журнал (`TastingRecord`, `MyCupRating`) — требует существующего `orderNumber`, недоступен без покупки через XO COFFEE. Никак не связан с Canonical Lot registry других roaster'ов.

**Где коллизия видна пользователю, а не только в коде:** `app/passport/[orderNumber]/page.tsx` задаёт `<title>Coffee Passport — XO COFFEE</title>`, а `LotPassportModal.tsx` рендерит ссылку с текстом `"Coffee Passport этого лота →"`, ведущую (когда/если заработает) на **другую**, внешнюю Coffee Passport. То есть на одной странице потенциально соседствуют два разных смысла одного и того же бренда.

**Риск:** при появлении реальной интеграции (виджет/CTA/redirect на настоящий Coffee Passport) пользователь и разработчик будут видеть слово "Coffee Passport" в двух несвязанных контекстах на одном сайте.

**Предложение безопасного имени (не переименовывать сейчас):** локальную фичу можно было бы называть **"Дегустационный дневник" / "My Cup" / "Мои дегустации"** — сохраняя за словом "Coffee Passport" исключительно внешнюю платформу. Переименование — отдельная задача (затронет 25 файлов, публичные URL `/passport/*`, localStorage-ключи `xo-coffee-orders`/`xo-coffee-tastings` не обязательно менять, но компоненты/типы/labels — да) и **не выполняется в P21**.

---

## 9. Required Store Data Model

Минимальная коммерческая модель `Product`, не копирующая Canonical Lot:

```text
Product
  id                  -- Store-internal identity (uuid, PK)
  slug                -- Store-facing URL slug (человеко-читаемый, Store-owned)
  name                -- витринное имя (может отличаться от Passport Coffee.name)
  description
  price_cents
  image_url
  category            -- Store-side мерчендайзинг категория, не обязана = Passport category
  published           -- boolean, видимость на витрине
  passport_public_id  -- см. раздел 10 — единственная связь с Coffee Passport
  created_at / updated_at
```

Явно избыточно для P21: `inventory`/`stock` (не запрошено сценарием, добавляется отдельно, когда появится реальная потребность), `sku` (см. раздел 10 — не путать с `passport_public_id`).

---

## 10. Product → Passport Lot Relation

**Имя поля: `passport_public_id`.**

Обоснование выбора:
- Не `lot_id` / `lotId` — эти имена уже заняты в этом же репозитории Store-локальным смыслом (`CartItem.id`, `OrderPayloadItem.lotId`, `TastingRecord.lotId` — все они ссылаются на Store `Lot.id`/`Product.id`, не на Passport). Переиспользование имени создало бы ту самую путаницу, которую параграф 6 задания требует развести.
- Не просто `public_id` — префикс `passport_` обязателен, чтобы при чтении схемы Store сразу было видно: это внешняя ссылка, а не Store-own identity (в отличие от `public.coffees.public_id` внутри самого Passport, где префикс не нужен — там контекст уже "мы и есть Passport").
- Тип — `text`, как и в самом Coffee Passport (`public.lots.public_id text not null unique`) — без парсинга, без предположений о формате (не UUID-валидация, не slug-regex). Store обязан relayть это значение непрозрачно.
- `unique`, но **не** primary key и **не** foreign key — физического FK в другую базу не существует (Store и Passport — разные БД/системы), это просто indexed reference column, ссылочная целостность обеспечивается на уровне интеграционного слоя (раздел 13), не БД.
- Nullable на первом этапе допустимо архитектурно (не каждый черновик Product обязан сразу быть привязан к Passport Lot — например, черновик, который мерчант ещё не выбрал), но это продуктовое решение, не техническое — P21 не фиксирует NOT NULL/NULLABLE окончательно, это входит в P22.

Явно **не использовать** в этой роли: Store-generated Lot ID (текущий `lot-014`-стиль), slug, order number, SKU, случайный UUID Store. Это прямо повторяет требование задания и совпадает с тем, что уже независимо установил P17-аудит.

---

## 11. Source of Truth

Coffee Passport остаётся единственным источником истины для:
- происхождения (`green_lots`: farm, variety, process, altitude, q_score);
- канонических roast/taste reference-данных (`reference_roast_profiles`, `reference_taste_profiles`);
- самого факта существования и владения Lot (`roaster_organization_id`).

Store **может** в будущем кэшировать *display-копию* отдельных полей (например, имя лота и обложку для рендера карточки без лишнего round-trip к Passport), но:
- кэш должен быть явно помечен как denormalized/refreshable (например, `passport_cache_synced_at`), никогда не выдаваться за источник истины;
- ключ синхронизации кэша — всегда `passport_public_id`, никогда обратное (Store не диктует Passport, что почём).

Это не проектируется в деталях в P21 (задание прямо просит не проектировать кэш без обоснования) — фиксируется только принцип.

---

## 12. Ownership Boundaries

Store-side "владение" ограничивается исключительно `Product` — коммерческой записью витрины. Store не является и не становится владельцем Canonical Lot ни в каком смысле.

Фильтр `roaster = XO COFFEE Roasting` (упомянутый в P20 как `roaster.slug = roaster-xo`) **архитектурно принадлежит границе интеграции** (раздел 13), а не схеме Store БД — Store не должен хранить `roaster_organization_id` у себя, потому что это создало бы ту же shadow-ownership модель, которую параграф 1 запрещает. Store лишь передаёт (или получает уже отфильтрованным) идентификатор ростера при обращении к интеграционному слою.

Важное ограничение, прямо из задания: то, что RLS Coffee Passport делает какую-то выборку из `public.lots` публично доступной для чтения (гостевой просмотр passport), **не означает**, что Store может просто ходить в Passport-таблицы напрямую тем же анонимным ключом. "Публичная строка" ≠ "безопасная для произвольного внешнего клиента поверхность". Будущая интеграция обязана идти через отдельный, контролируемый read-only server-side слой (раздел 13), а не через прямой Supabase-клиент к чужой базе.

---

## 13. Future Integration Boundary

Рекомендуемое место: новый server-only модуль, по аналогии с уже существующим паттерном `src/lib/supabase/server.ts` (server-only, никогда не импортируется в `"use client"` файл, явно падает при отсутствии конфигурации, а не тихо возвращает пустоту).

Условное имя: `src/lib/passport/server.ts` (не создаётся в P21). Обязанности этого слоя, когда он появится:
- единственная точка, которая обращается к будущей read-only integration-поверхности Coffee Passport (какой бы she ни оказалась — REST/RPC/отдельный Supabase read-replica с собственными ограниченными policy — решает сторона Passport, не Store);
- фильтрация по `roaster = XO COFFEE Roasting` происходит здесь, а не в UI и не в схеме Store;
- никогда не передаёт напрямую сырые Passport-строки в клиентский компонент без явного маппинга на то, что реально нужно merchant picker'у;
- никакого service-role/секретного ключа Passport в browser-бандле.

Merchant/catalog UI (будущий) обращается только к этому слою, никогда — к Passport напрямую.

---

## 14. Recommended Database Architecture

Store's собственная БД (Supabase или аналог — конкретный выбор вне рамок P21) должна содержать **только коммерческие таблицы**:

```
products                  -- см. раздел 9
-- опционально, по мере реальной необходимости, не сейчас:
product_images
merchants / store_users   -- если понадобится auth для мерчант-панели
orders / order_items      -- сегодня заказы вообще не персистятся (только Telegram) —
                           -- если это изменится, это отдельная, коммерческая, Store-own сущность,
                           -- не Canonical Lot
```

Явно **не должно существовать** в Store БД: `organizations`, `coffees`, `green_lots`, `lots`, `roast_batches`, `reference_roast_profiles`, `reference_taste_profiles` — всё это принадлежит исключительно Coffee Passport и там, по вводным P20, уже реализовано.

---

## 15. Migration Strategy

| Часть старой миграции | Решение | Почему |
|---|---|---|
| `profiles` + `handle_new_user` триггер | **REWORK (отложено)** | Паттерн auto-profile-on-signup сам по себе универсален и мог бы пригодиться, если Store когда-нибудь заведёт свою auth для merchant-панели — но переносить его сейчас незачем (нет auth-сценария в P21/P22). Не включать в первую Store-миграцию. |
| `organizations`, `organization_members`, `organization_role` enum | **REMOVE / DO NOT APPLY** | Это моделирование владения Roaster/Café-организацией Canonical Lot — целиком принадлежит Coffee Passport, уже там существует (`roaster_id`, `roaster.slug`). Дублирование = вторая ownership-система. |
| `coffees`, `green_lots` | **REMOVE / DO NOT APPLY** | Canonical origin-данные, источник истины — Passport. |
| **`lots`** | **REMOVE / DO NOT APPLY** | Это и есть Canonical Lot таблица — центральный объект, который параграф 1 задания прямо запрещает дублировать в Store. |
| `roast_batches`, `reference_roast_profiles`, `reference_taste_profiles` | **REMOVE / DO NOT APPLY** | Версионированные reference-данные лота — исключительно Passport. |
| Паттерн `public_id` (immutable, "not a slug", `not null unique`, коммент на колонке) | **KEEP как паттерн, не как таблицу** | Сам принцип — иметь стабильный публичный идентификатор, не производный от имени — стоит применить и к Store `Product` (если понадобится собственный публичный slug помимо `id`), но это не тот же столбец: у Store он не заменяет `passport_public_id`, а сосуществует с ним под другим именем (`slug`). |
| RLS-паттерн через `is_org_member()`-style security-definer helper | **KEEP как техника, не как код** | Полезный общий приём для будущей merchant-auth модели Store, если/когда она появится — но конкретная функция `is_org_member` привязана к Passport-специфичным ролям (`roaster`/`cafe`) и не переносится как есть. |

**Немедленное действие (не входит в код-часть P21, фиксируется как решение отчёта):** файл `supabase/migrations/20260911120000_coffee_passport_foundation.sql` не должен применяться ни в каком виде к будущей Store БД. Его дальнейшая судьба (удалить из репозитория Store / архивировать с пометкой / физически перенести историю в репозиторий Coffee Passport, если она там нужна как референс) — решение владельца репозитория, не автоматическое действие агента (см. параграф 16 задания — файл не тронут в этой сессии).

---

## 16. What Must Not Be Implemented (в этой сессии, P21)

Согласно прямому указанию задания — ничего из следующего не делалось и не будет:

- Passport API — не создавался;
- merchant picker — не создавался;
- database migration в production — не применялась (и не создавалась новая);
- Supabase connection — не устанавливалось;
- автоматическая синхронизация — не создавалась;
- импорт Lots — не выполнялся;
- создание Products из Passport — не выполнялось;
- создание новых Lots — не выполнялось;
- переименование локальной "Coffee Passport" фичи — не выполнялось (только предложено имя-кандидат в разделе 8).

---

## 17. Risks

1. **Дормant-миграция как ловушка.** Пока файл `20260911120000_coffee_passport_foundation.sql` физически лежит в `supabase/migrations/` репозитория Store, любой будущий разработчик (человек или агент), запустивший `supabase db push` не читая P14/P21 отчётов, создаст вторую Canonical Lot систему за одну команду. Это самый конкретный и самый простой в реализации риск из всех перечисленных.
2. **`coffeePassportLink.ts` как тихая мина.** Если `NEXT_PUBLIC_COFFEE_PASSPORT_LOT_URL_TEMPLATE` будет задана без предварительного решения о реальном mapping'е `Lot.id → passport_public_id`, функция начнёт генерировать нерабочие или указывающие не туда ссылки, никак не давая об этом знать (нет валидации на другом конце).
3. **Naming collision при реальной интеграции.** Появление настоящего Coffee Passport UI/CTA рядом с локальной "Coffee Passport" фичей на одних и тех же страницах (`LotPassportModal`, `/passport/[orderNumber]`) создаёт путаницу для пользователя и для разработчиков, которые будут грепать "passport" и находить оба смысла вперемешку.
4. **`ADMIN_PASSWORD` — мёртвая, но задекларированная переменная.** Не риск для P21 напрямую, но гигиенический сигнал: `render.yaml`/`.env` объявляют секрет, который ничего не защищает, потому что не читается кодом — стоит отдельно прояснить с владельцем, нужен ли он вообще (не в рамках P21).
5. **Отсутствие персистентного order-слоя.** Сегодня заказ живёт только как Telegram-сообщение и localStorage-запись у конкретного браузера. Любая будущая связь `Product ↔ Order` (для аналитики продаж по `passport_public_id`, например) потребует сначала решить более базовую задачу — БД для заказов вообще, что явно **не** входит в P21/P22 по формулировке задания (orders — "eventual", не сейчас).

---

## 18. Exact P22 Implementation Plan (проектируется, не реализуется)

**Что действительно нужно XO Store:**
- одна новая, самостоятельная таблица `products` (см. раздел 9), без каких-либо ссылок на `organizations`/`coffees`/`green_lots`.

**Какие старые таблицы не нужны:**
- весь набор из раздела 6/15 с вердиктом REMOVE (`organizations`, `organization_members`, `coffees`, `green_lots`, `lots`, `roast_batches`, `reference_roast_profiles`, `reference_taste_profiles`).

**Какая migration должна быть создана (в P22, не сейчас):**
- новый файл `supabase/migrations/<timestamp>_store_products_foundation.sql`, с нуля, содержащий только `products` (и, при необходимости, `product_images`) — не модификация старого файла, а отдельный, независимый от него артефакт. Старый файл при этом остаётся нетронутым либо архивируется отдельным явным решением владельца (не частью этой миграции).

**Где хранить `passport_public_id`:**
- колонка `products.passport_public_id text unique` (nullable/not null — продуктовое решение P22, не техническое).

**Как Product будет связан с Passport Lot:**
- исключительно по значению `passport_public_id`, через будущий read-only integration-слой (раздел 13) — никогда напрямую по Store `Product.id`/`slug`, никогда через прямой SQL-JOIN между базами (его физически не может быть — разные БД).

**Какой server-side integration boundary нужен:**
- `src/lib/passport/server.ts` (или аналогичное имя) — server-only модуль, единственная точка входа к Passport-данным для Store, по образцу уже существующего `src/lib/supabase/server.ts`. Реализация — предмет отдельного P-шага, не P22 целиком (P22 — это уже сама Store-миграция/Product-модель; интеграционный слой к реальному Passport API может потребовать ещё один шаг после него, когда сам Passport API будет готов).

**Какой merchant UI понадобится (не сейчас):**
- экран "выбрать Lot из списка, полученного от интеграционного слоя → создать/обновить Product с этим `passport_public_id`" — сценарий из раздела 7 задания. Не проектируется в деталях в P21/P22 (требует сначала готового Passport-API).

**Порядок работ:**
1. **Первым** — миграция `products` (раздел 9), без какой-либо зависимости от Passport. Это разблокирует Store как независимый коммерческий data layer уже сейчас, даже без интеграции.
2. **Вторым** — контракт (интерфейс/тип) интеграционного read-only слоя (раздел 13), пусть даже сначала как заглушка/мок без реального Passport API — чтобы `passport_public_id` в `products` с первого дня использовался по правильному контракту, а не как "просто текстовое поле".
3. **Третьим** — сам merchant picker UI, только когда реальная Passport-интеграция (пункт 2, но не заглушка) готова к использованию.

P22 в рамках этого плана — это **пункт 1 (и, возможно, дизайн контракта из пункта 2)**, не более. Реализация не выполняется в текущей сессии.

---

## 19. Git status после аудита

```
$ git status
On branch master
Your branch is ahead of 'origin/master' by 1 commit.
nothing to commit, working tree clean
```

Изменений в этой сессии не вносилось — создан только этот отчёт (`P21_XO_STORE_DATA_ARCHITECTURE_AUDIT.md`). Никаких production migrations, никакого применения старой миграции, никакого подключения реальной БД не выполнялось. Существующие незакоммиченные/посторонние изменения на входе отсутствовали (working tree было чистым).
