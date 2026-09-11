# P14 — Coffee Passport Architecture Foundation

Исходный commit: `1b44b1b`
Итоговый commit: см. раздел "Final status" ниже.

---

## Важная оговорка, читать первой

**В этом проекте нет живого Supabase-проекта, и в этой рабочей среде нет способа его создать или запустить.** Проверено перед началом работы:

- `.env` не содержит `SUPABASE_*`/`NEXT_PUBLIC_SUPABASE_*` переменных (только `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `ADMIN_PASSWORD` — все не относятся к Supabase).
- Supabase CLI не установлен локально (`npx supabase --version` работает, но это не значит, что есть проект — это просто npm-пакет).
- Docker не установлен, поэтому `supabase start` (локальный стек Postgres/Auth/Studio) невозможен.
- Нет упоминаний Supabase-проекта ни в одном файле репозитория (подтверждено ещё в P13, перепроверено здесь).

Создавать новый внешний Supabase-проект самостоятельно я не стал: это внешний сервис, потенциально с биллингом, и заводить его от имени владельца без его участия — не та вещь, которую стоит делать автономно.

**Что это значит для P14:** SQL-миграция и RLS-политики ниже — это спроектированный, но **никогда не выполнявшийся** код. Ни одна таблица физически не создана. Ни одна RLS-политика не проверена против реальных данных. Это честно отражено везде далее в отчёте — я не выдаю дизайн за развёрнутую систему.

**Что я мог сделать без живого проекта — и сделал:** написал SQL-миграцию (готовую к `supabase db push`, как только появится реальный проект), TypeScript-типы под эту схему, клиентский код (browser + server) со здравыми defaults (никогда не ломается при отсутствии env-переменных — явно бросает понятную ошибку, а не тихо создаёт неработающий клиент), `.env.example` и обновил `.gitignore`, чтобы этот example-файл действительно попадал в git.

---

## 1. Initial state

Из P13: single-tenant D2C-сайт, одна плоская сущность `Lot` (`src/types/lot.ts`) из статического `src/data/lots.json`, Coffee Passport целиком на localStorage браузера, нет auth, нет БД, нет ролей.

Проверено перед началом работы (раздел 14 задания):

```
git status   → clean
git log -1   → 1b44b1b P13: product/role/route E2E audit
```

---

## 2. Architecture implemented

Спроектированы (SQL + TypeScript), но **не развёрнуты**:

```
organizations ──┬── organization_members (role: roaster | cafe)
                 │
profiles ────────┘ (1:1 с auth.users)

organizations (roaster) ──< coffees ──< green_lots
                              │              │
                              └──< lots ─────┘   (Canonical Lot)
                                     │
                                     ├──< roast_batches
                                     ├──< reference_roast_profiles (versioned)
                                     └──< reference_taste_profiles (versioned)
```

Цепочка **Roaster → Coffee → Green Lot → Canonical Lot → Roast Batch → Reference Roast/Taste Profile** реализована именно в этом порядке связей.

---

## 3. Database schema

Файл: `supabase/migrations/20260911120000_coffee_passport_foundation.sql`

| Таблица | Ключи | Связи | Назначение |
|---|---|---|---|
| `profiles` | PK `id` (= `auth.users.id`) | — | Личность пользователя. Заполняется триггером `handle_new_user` при signup. |
| `organizations` | PK `id` (uuid), unique `public_id` | — | Заготовка Roaster/Café организации. Тип роли — не на этой таблице, а на `organization_members.role`. |
| `organization_members` | PK (`organization_id`, `user_id`) | → `organizations`, → `profiles` | Связь пользователя с организацией + роль (`roaster` \| `cafe`, enum `organization_role`). |
| `coffees` | PK `id`, unique `public_id` | → `organizations` (roaster) | Canonical Coffee. |
| `green_lots` | PK `id`, unique `public_id` | → `coffees`, → `organizations` | Конкретная партия зелёного кофе. Поля — farm, farm_story, variety, process, altitude_masl, q_score — взяты напрямую из существующего `Lot` типа, ничего не добавлено. |
| `lots` (**Canonical Lot**) | PK `id`, unique `public_id` | → `coffees`, → `green_lots`, → `organizations` | Центральная сущность. name, category, tags, price_cents, brew (jsonb) — retail-поля. |
| `roast_batches` | PK `id`, unique `public_id` | → `lots`, → `organizations` | Одна обжарочная партия конкретного Lot. Один Lot — много Roast Batch. |
| `reference_roast_profiles` | PK `id`, unique (`lot_id`, `version`) | → `lots`, → `profiles` (created_by) | Версионируемые, append-only. `data jsonb` — намеренно тонкая структура (см. раздел 8). |
| `reference_taste_profiles` | PK `id`, unique (`lot_id`, `version`) | → `lots`, → `profiles` (created_by) | Версионируемые, append-only. acidity/sweetness/body/aroma/finish + sensory + cup_note — 1:1 с текущим `FlavorProfile`. |

`public_id` на `coffees`/`green_lots`/`lots`/`roast_batches` — отдельное от uuid `id` поле, `unique`, никогда не переиспользуется и не порождается из `name` (не slug). Заполнение (генерация значения) в этой фазе не реализовано — это ответственность следующего этапа (сейчас нет приложения, которое создавало бы строки).

---

## 4. Ownership model

> **Canonical Lot принадлежит Roaster.** Реализовано через `lots.roaster_organization_id` + RLS, не через UI.

- Создать/изменить/удалить `coffees`, `green_lots`, `lots`, `roast_batches` может только пользователь, состоящий в `organization_members` соответствующей `roaster_organization_id` с `role = 'roaster'`.
- `reference_roast_profiles`/`reference_taste_profiles` — insert разрешён только roaster-члену организации, владеющей родительским `lot`; update/delete запрещены вообще (append-only версионирование — новая версия это новая строка, а не правка старой).
- **Нет `cafe_lots`, `local_lots`, `shadow_lots`, `guest_lots`.** Единственная таблица лотов — `lots`.
- Café-роль (`organization_members.role = 'cafe'`) не имеет ни одной write-policy ни на одной из этих таблиц.

---

## 5. RLS model

**16 RLS policies**, все в одной миграции, все `enable row level security` включено для каждой из 9 таблиц.

| Кто | Что реально защищено |
|---|---|
| **Anonymous / Public** | Ничего не может SELECT ни в одной из 9 таблиц. Нет policy для anon-роли ни на одной таблице. Это осознанное решение, не недосмотр — см. ниже. |
| **Authenticated, не член организации** | Может создать организацию (`organizations_insert_authenticated`) и добавить туда себя первым участником (`organization_members_bootstrap_self`, только если у организации ещё нет ни одного участника). Больше ничего. |
| **Authenticated Roaster (член org с role='roaster')** | Полный CRUD на `coffees`/`green_lots`/`lots`/`roast_batches`, ограниченный своей `roaster_organization_id`; insert-only на reference-профили тех же lots. |
| **Café (член org с role='cafe')** | **Не получает ни одной policy** ни на одной из canonical-таблиц — ни SELECT, ни mutation. Это временное, осознанное решение (см. Deferred). |
| **Guest** | Не отличается от Anonymous в этой схеме — в системе нет отдельного «Guest» уровня доступа к БД, потому что Guest в текущем продукте не создаёт никаких серверных сущностей вообще (Coffee Passport-дегустации остаются в localStorage, см. раздел 12). |

**Почему у Public/anon нет SELECT вообще, хотя задание просило «может получать только данные для public Passport»:** сегодня ни на одной таблице нет поля вроде `published`/`status`, которое отличало бы «готово к публичному показу» от «в работе у Roaster». Написать anon-policy `using (published = true)` для несуществующей колонки означало бы придумать модель публикации, которой пока нет — то есть нарушить прямую инструкцию «не изобретать недостающую архитектуру». Это зафиксировано как gap, а не закрыто произвольным решением.

**Защита от рекурсии RLS:** политики на `organizations`/`organization_members` и ниже используют `security definer` функцию `public.is_org_member(org_id, role?)` вместо прямого подзапроса к `organization_members` внутри его же policy — стандартный приём Supabase, чтобы избежать infinite recursion при самоссылающихся RLS-проверках.

**Не проверено против реальных данных** — нет живой БД, чтобы прогнать `pgTAP`/ручные запросы под разными ролями. SQL написан корректно по синтаксису и логике, но "фактически защищённые access boundaries" в буквальном смысле "проверенные" — не могут быть, пока миграция не применена.

---

## 6. Auth model

**Реализовано:**
- `profiles` таблица + `handle_new_user()` trigger на `auth.users` (стандартный Supabase-паттерн — без него `profiles` никогда не заполнится).
- Browser client (`src/lib/supabase/client.ts`) через `@supabase/ssr`'s `createBrowserClient`.
- Server client (`src/lib/supabase/server.ts`) через `@supabase/ssr`'s `createServerClient` с Next.js `cookies()` (async, под Next.js 16).
- Оба клиента используют **только anon/publishable key** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) — ни один service-role key не создан, не упомянут в коде, не нужен ни одной policy выше (все policies выражены через `auth.uid()` + членство в организации, а не через доверенный backend-бэйпас).
- Оба клиента бросают понятную ошибку, если env-переменные не заданы — не создают тихо неработающий клиент (тот же defensive-стиль, что уже в `src/lib/telegram.ts`).

**Отложено (сознательно, как и требовало задание):**
- Полноценный onboarding UI (страницы входа/регистрации).
- Invitations / добавление участников в организацию кем-то, кроме bootstrap-создателя.
- Password recovery UX.
- Social login.
- Café/Roaster dashboard любого вида.

**Ничего из auth-кода не подключено ни к одной существующей странице** — `src/lib/supabase/*` не импортируется ни из `app/page.tsx`, ни из `app/passport/**`, ни из какого-либо существующего компонента.

---

## 7. Existing D2C compatibility

Почему текущий сайт продолжает работать без изменений:

- `src/data/lots.json`, `src/data/lots.ts`, `src/types/lot.ts` — **не тронуты**. Существующий каталог, Discovery, Cart, Checkout, Coffee Passport (localStorage) работают как раньше.
- Ни один новый файл (`src/lib/supabase/*`, `src/types/domain.ts`) не импортируется ни одним существующим компонентом или маршрутом — подтверждено: новая функциональность физически изолирована, старый функционал не видит новый код вообще.
- Новые npm-зависимости (`@supabase/supabase-js`, `@supabase/ssr`) добавлены в `package.json`, но не исполняются, если explicitly не импортированы — а их explicit-но никто не импортирует.
- Проверено вживую после всех изменений: production build (`next start`) + переход по каталогу, открытие Lot Passport — без единой console-ошибки, без изменения поведения.

---

## 8. Migration map — как существующий `Lot` в будущем ляжет на новую схему

| Поле `Lot` (`src/types/lot.ts`) | Куда переходит | Причина |
|---|---|---|
| `id` | — (заменяется на новый uuid `lots.id` + `lots.public_id`) | Текущий `id` — стабильный slug (`lot-014`), не uuid. Может стать источником для генерации `public_id` при миграции, но не самим `public_id`. |
| `name` | `lots.name` | Retail-название («Лот № 014»), не свойство зерна. |
| `category` | `lots.category` | Retail/merchandising классификация. |
| `tags` | `lots.tags` | Retail/маркетинговые тэги. |
| `country`, `region` | `coffees.country`, `coffees.region` | Идентичность Coffee, не конкретной партии. |
| `farm` | `green_lots.farm` | Свойство конкретной зелёной партии. |
| `farmStory` | `green_lots.farm_story` | Нарратив про конкретную ферму/партию. |
| `variety` | `green_lots.variety` | Свойство зелёного зерна. |
| `process` | `green_lots.process` | Свойство зелёного зерна (обработка до обжарки). |
| `altitudeMasl` | `green_lots.altitude_masl` | Свойство зелёного зерна. |
| `qScore` | `green_lots.q_score` | Q-грейдинг — оценка зелёного/чашечного потенциала, логически привязана к green lot. |
| `sensory` | `reference_taste_profiles.sensory` | Вкусовой дескриптор — не green-coffee факт. |
| `cupNote` | `reference_taste_profiles.cup_note` | Дегустационная фраза. |
| `flavorProfile` (5 осей) | `reference_taste_profiles.{acidity,sweetness,body,aroma,finish}` | Прямое 1:1 соответствие. |
| `price` | `lots.price_cents` | Retail-факт, привязан к Canonical Lot (не к конкретной обжарочной партии — в этой фазе цена не варьируется по batch). |
| `brew` | `lots.brew` (jsonb) | Инструкция по приготовлению — retail-факт о лоте, не факт про сам процесс обжарки, поэтому НЕ на `reference_roast_profiles` (см. ниже). |

**Заметка про `reference_roast_profiles`:** сегодняшний продукт не хранит ни одного технического параметра именно обжарки (температура спада, время развития и т.п.) — только `brew` (как заваривать), который логически про приготовление, а не про обжарку. Поэтому `reference_roast_profiles.data` оставлен как `jsonb` catch-all, без придуманных именованных колонок — честнее оставить его тонким, чем выдумать поля, которых продукт пока не подтверждает.

**Что эта карта НЕ делает:** она не переносит ни одной реальной записи из `lots.json` в БД. Это план соответствия полей для будущего migration-скрипта, который будет отдельным этапом после проверки foundation — ровно как и просило задание.

---

## 9. Validation

```
npx tsc --noEmit   → чисто
npx eslint .        → чисто
npx next build      → успешно, те же 5 маршрутов (/ , /_not-found, /api/order, /passport, /passport/[orderNumber])
```

Живая проверка на production build (`next start`): открытие `/`, открытие Lot Passport модалки — рендерится корректно, 0 console-ошибок. Полный E2E funnel не гонялся заново целиком (не было изменений в существующем runtime-коде, только добавлены изолированные новые файлы) — точечная проверка подтвердила отсутствие регрессии, а не заново весь путь Hero→Checkout, который уже многократно проверен в P7–P12 и не мог быть затронут этой фазой.

---

## 10. Deferred work

Явно не реализовано в P14 (как и требовало задание):

- Café dashboard, Guest dashboard, полноценная система аккаунтов.
- QR generation / QR scanning.
- Миграция Coffee Passport tasting UI, My Coffee, Similar Lots на новую БД — они остаются на localStorage без изменений.
- Production/warehouse management, inventory.
- Payments, checkout rewrite.
- Юридические страницы (уже отдельно зафиксировано в P12).
- UI редизайн.
- **Реальное развёртывание миграции** — нет живого Supabase-проекта, значит ничего из раздела 3–6 физически не существует как работающая БД. Это не «недоделано», это «не может быть сделано в этой среде без внешнего проекта».
- **RLS-политики для Café read-access и для anon/Public Passport** — сознательно не написаны, потому что нет модели «published»/«что видно кафе» — придумывать её сейчас означало бы нарушить прямой запрет на изобретение архитектуры.
- **Генерация `public_id` значений** — механизм (функция/дефолт) не реализован, потому что ничего пока не создаёт строки в этих таблицах.

---

## Final status

- Исходный commit: `1b44b1b`
- Итоговый commit: `<заполняется после commit, см. git log>`
- Создано таблиц: **9** (`profiles`, `organizations`, `organization_members`, `coffees`, `green_lots`, `lots`, `roast_batches`, `reference_roast_profiles`, `reference_taste_profiles`) — **спроектированы в SQL, не применены к живой БД** (нет Supabase-проекта в этой среде).
- RLS policies: **16**, написаны, не проверены против реальных данных.
- Auth status: Supabase Auth используется как identity-источник в дизайне (`auth.users` → `profiles` trigger); никакого onboarding UI не реализовано; клиентский/серверный код написан, но не подключён ни к одной странице и не может быть протестирован без реального проекта.
- Build status: `tsc`/`eslint`/`next build` — все чисто.
- D2C regression status: подтверждено отсутствие регрессии (production build запущен, каталог и Lot Passport открываются, 0 console-ошибок); существующий код не изменён и физически изолирован от новых файлов.
- Что реально реализовано: SQL-схема + RLS-дизайн (файл), TypeScript-типы под схему, browser/server Supabase client scaffolding, `.env.example`, обновление `.gitignore`.
- Что НЕ реализовано: сама база данных (нет живого проекта), любой UI, любая интеграция с существующими страницами, генерация `public_id`, Café/Public read-политики (осознанно отложено, не спроектированная модель публикации).

# COMPLETE WITH NOTES

Не `COMPLETE` без оговорок — потому что ключевая часть фундамента (реальная работающая БД) физически не может быть создана в этой рабочей среде без внешнего Supabase-проекта, которого сейчас нет и который я не стал заводить самостоятельно. Не `BLOCKED` — потому что всё, что можно было спроектировать и написать без живого проекта (схема, RLS, типы, клиентский код, migration map), сделано полно и корректно, и существующий D2C-сайт не задет. Следующий шаг перед реальным использованием этого фундамента — владельцу нужно создать (или предоставить доступ к) Supabase-проекту и заполнить `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`, после чего миграцию можно применить и проверить RLS против реальных данных.
