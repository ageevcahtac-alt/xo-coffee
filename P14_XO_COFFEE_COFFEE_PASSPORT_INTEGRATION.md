# P14 — XO COFFEE × Coffee Passport Integration Bridge

## 1. Исходный commit

`b316403` — "P14: establish Coffee Passport architecture foundation" (предыдущая, ошибочная попытка построить Coffee Passport foundation внутри XO COFFEE — см. раздел 10).

## 2. Итоговый commit

См. `git log -1` после коммита этой работы (раздел 27 инструкции просит один commit; хэш не самореференцируется в этом файле, чтобы не создавать искусственную зависимость файла от собственного коммита).

---

## Прочитать первым: реальное состояние против ожидаемого

Задание описывает Coffee Passport как **отдельную, уже готовую платформу** со своей архитектурой, ролями, Canonical Lot, гостевым профилем и tasting-механикой — и просит построить только интеграционный мост со стороны XO COFFEE.

Аудит репозитория (раздел 6 задания) даёт честный, проверяемый результат:

- **Внешней Coffee Passport платформы не существует ни в каком виде, который был бы виден из этого репозитория.** Нет ни одного URL, домена, API-контракта, переменной окружения или документации, указывающей на внешнюю систему. Проверено построчным grep по всему `src/`/`app/` — все совпадения на «coffee passport»/«passport» относятся к **встроенной** в это же приложение фиче (`/passport/[orderNumber]`, `/passport`, `src/lib/coffeePassport.ts`), появившейся в P0–P6, задолго до P13/P14.
- **Встроенная Coffee Passport-фича — не отдельное приложение.** Это страницы того же Next.js-приложения, данные — в localStorage браузера.
- **Встроенная модель дегустации — order-scoped, не lot-scoped.** `TastingRecord` (`src/types/coffeePassport.ts`) требует `orderNumber: string` (не опционально). Сохранить дегустацию можно только через `CoffeePassportDetail`, который рендерится только из `CoffeePassportPage` (`/passport/[orderNumber]/page.tsx`), которая требует найденный `getOrderRecord(orderNumber)` — то есть **реально существующий заказ**. Анонимный человек, отсканировавший QR без покупки через XO COFFEE, физически не может создать дегустацию в текущей системе — такого пути нет.

Это прямое противоречие с целевым сценарием задания (раздел 15, Сценарий A: QR → Lot → tasting → результат → **опциональная** регистрация, без покупки). Ниже — честная фиксация этого противоречия (раздел 28 инструкции: «не изобретай архитектуру, остановись, зафиксируй, предложи минимальное решение»), плюс то, что было реально сделано без нарушения этого правила.

---

## 3. Canonical Lot ID

**Используется существующий `Lot.id`** (`src/types/lot.ts`), новый идентификатор не создавался.

Проверено кодом (`node -e` над `src/data/lots.json`):

```
ids: ['lot-014', 'lot-027', 'lot-031', 'lot-042', 'lot-056', 'espresso-nol', 'espresso-ugol', 'specialty-degustation']
all unique: true
all url-safe slugs: true
```

- Стабилен: hand-assigned slug, не производится из `name`/цены/других изменяемых полей.
- Уникален: подтверждено программно на всех 8 текущих лотах.
- Immutable: во всём runtime-коде нет ни одного пути мутации `LOTS` (тот же вывод, что и в P13) — редактировать `id` может только человек, правящий `lots.json` и делающий новый деплой.
- Уже используется как единственный identifier везде: React key, `CartItem.id`, `OrderRecordItem.lotId` (localStorage-заказ, использует его для резолва в `/passport/[orderNumber]`), `LOTS.find(l => l.id === ...)`.

**Не создавался новый `public_id`.** Единственное место, где в репозитории вообще фигурирует концепция `public_id`, — файлы предыдущего экспериментального Supabase foundation (`src/types/domain.ts`), которые не подключены ни к чему (см. раздел 10). Из живого кода следует, что `Lot.id` уже полностью пригоден для интеграции — конфликта не найдено.

---

## 4. Passport URL

Централизованная функция: **`getCoffeePassportUrl(lotId)`** в новом файле `src/lib/coffeePassportLink.ts`.

Как она работает:

```ts
export function getCoffeePassportUrl(lotId: string): string | null {
  const template = process.env.NEXT_PUBLIC_COFFEE_PASSPORT_LOT_URL_TEMPLATE;
  if (!template || !template.includes("{lotId}")) return null;
  return template.replace("{lotId}", encodeURIComponent(lotId));
}
```

**Почему шаблон целиком, а не просто origin:** я не знаю реальную структуру маршрутов внешней Coffee Passport платформы (`/lot/:id`? `/l/:id`? query-параметр?) — и придумывать её означало бы нарушить прямой запрет раздела 28 («Passport URL неизвестен... не изобретай»). Поэтому конфигурируется весь шаблон с плейсхолдером `{lotId}` — когда владелец Coffee Passport сообщит реальный URL, он подставляется целиком, без моих предположений о форме маршрута.

**Сегодня функция возвращает `null`** (переменная `NEXT_PUBLIC_COFFEE_PASSPORT_LOT_URL_TEMPLATE` не задана ни в `.env`, ни где-либо ещё) — и единственный вызывающий код (`LotPassportModal.tsx`) корректно не рендерит ссылку в этом случае. Проверено вживую: в открытой карточке лота сегодня **нет** видимой ссылки на Coffee Passport — это осознанно честное поведение, а не забытая функциональность.

---

## 5. Cart

**Lot ID уже сохранялся корректно, менять не пришлось.** `CartItem.id` (`src/context/CartContext.tsx`) заполняется значением `lot.id` во всех точках добавления в корзину (`Catalog.tsx`, `LotPassportModal.tsx`, `DiscoveryModal.tsx`, `MyCoffeePage.tsx`) — подтверждено построчно и живым тестом (добавлен `lot-014`, проверено значение в `localStorage.xo-coffee-cart` → `id: "lot-014"`).

Поле называется generic `id`, а не `lotId` — я не стал переименовывать его: это затронуло бы много мест ради стилистической ясности без функционального изменения (Lot identity уже не теряется), а задание прямо разрешает «использовать реальную архитектуру проекта, а не обязательно exact shape».

---

## 6. Order

**Найден и исправлен реальный gap:** `OrderPayloadItem` (`src/types/order.ts`) — тип payload, отправляемого в `/api/order` (уведомление в Telegram) — не содержал Lot ID, только `name/quantity/price/packaging`.

Исправление:

```diff
 export type OrderPayloadItem = {
+  lotId: string;
   name: string;
   quantity: number;
   price: number;
   packaging: "whole-bean";
 };
```

и в `src/components/cart/PaymentStep.tsx`, при формировании `payload.items`: добавлено `lotId: item.id`.

**Подтверждено вживую перехватом `fetch`** (не просто чтением кода) — реальный POST body на `/api/order`:

```json
[{"lotId":"lot-014","name":"Лот № 014","packaging":"whole-bean","price":1490,"quantity":1}]
```

Отдельно: `OrderRecordItem` (`src/types/coffeePassport.ts`, локальное хранение заказа для встроенного `/passport/[orderNumber]`) **уже содержал** `lotId` до этой сессии — тут ничего менять не требовалось, подтверждено живым тестом.

Шаблон Telegram-сообщения (`src/lib/telegram.ts`) не менялся — новое поле там просто не используется в тексте уведомления (не влияет на существующий формат).

---

## 7. QR

**QR физически не реализован — и не должен был быть реализован на этом этапе** (прямой запрет раздела 13/22).

Что подготовлено для будущего QR: URL, на который в итоге будет вести QR-код, строится единственной функцией `getCoffeePassportUrl(lotId)` — как только Coffee Passport платформа предоставит реальный `NEXT_PUBLIC_COFFEE_PASSPORT_LOT_URL_TEMPLATE`, тот же самый URL корректен и для QR (генерация самого QR-изображения — не задача XO COFFEE, это либо задача Coffee Passport, либо упаковочного производства; XO COFFEE только должен уметь построить правильный URL, что уже сделано).

Почему он «указывает на правильный Lot»: потому что единственный входной параметр — уже проверенный, стабильный `Lot.id` (раздел 3), а не что-то новое.

---

## 8. UX — QR → Lot → tasting → регистрация только для сохранения

**Не может быть подтверждено сегодня — см. противоречие в начале отчёта.** Технически:

- Открытие Lot **без регистрации** — да, работает (это просто существующий каталог/лот, доступный анонимно).
- Прохождение tasting **без регистрации, без покупки** — **невозможно** в текущей встроенной Coffee Passport, потому что `TastingRecord` требует `orderNumber` существующего заказа. Анонимный посетитель, пришедший по QR без покупки через XO COFFEE, не может сохранить впечатление даже временно.
- «Предложить сохранить результат → регистрация» — такого пути тоже нет, потому что нет способа получить «результат» без заказа в принципе.

Это не то, что можно исправить точечным изменением в XO COFFEE: это структурное свойство Coffee Passport (не XO COFFEE) — тот самый tasting engine и его data model, которые прямо запрещено трогать в этом этапе («НЕ реализовывать: tasting engine, personal Coffee Passport»). Чтобы Сценарий A из задания стал реальным, Coffee Passport (где бы он ни жил — отдельным приложением или как будущая переработка встроенной фичи) должен обзавестись lot-scoped точкой входа, не требующей заказа. Это решение — не то, что XO COFFEE может принять за Coffee Passport.

---

## 9. Architecture

Подтверждено:

- ✅ XO COFFEE остаётся отдельным приложением — никаких новых страниц/ролей/дашбордов не добавлено.
- ✅ Coffee Passport (встроенная фича) не тронута ни на строку — `src/lib/coffeePassport.ts`, `src/components/passport/*`, `/passport/**` routes идентичны состоянию до этой сессии.
- ✅ Нет новой БД для Coffee Passport (экспериментальный Supabase foundation не развивался, не подключался — см. ниже).
- ✅ Нет новой auth-системы.
- ✅ Нет дублирования Canonical Lot — не создано ни одной новой Lot-подобной сущности; всё строится на существующем `Lot.id`.
- ✅ Нет `cafe_lots`/`shadow_lots`/`local_lots` — ничего такого не создавалось.

---

## 10. Experimental foundation

**Найден и зафиксирован, не удалён и не развивался.**

Commit `b316403` (предыдущий этап, до этой сессии) создал:

- `supabase/migrations/20260911120000_coffee_passport_foundation.sql` — 9 таблиц + 16 RLS policies, **никогда не выполнявшиеся** (нет живого Supabase-проекта).
- `src/types/domain.ts` — TypeScript-типы под эту схему.
- `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts` — клиентский код, ни к чему не подключённый.
- `.env.example`, правка `.gitignore`.

Проверено заново в этой сессии: `grep` по всему `src/`/`app/` на импорты `lib/supabase` или `types/domain` из любого другого файла — **пусто**. Ничего из этого не используется живым приложением.

> **Experimental / superseded — not part of the production XO COFFEE × Coffee Passport integration architecture.**
>
> Этот foundation был построен на предположении, что Coffee Passport ещё нужно строить внутри XO COFFEE. Это предположение отменено данным этапом. Файлы не удалены автоматически (по прямой инструкции раздела 23 — удаление отдельным revert должно быть осознанным решением владельца, не побочным эффектом этой задачи), но не должны рассматриваться как часть production-архитектуры и не должны развиваться дальше в этом направлении.

---

## 11. Validation

```
npx tsc --noEmit   → чисто
npx eslint .        → чисто
npx next build      → успешно, те же 5 маршрутов (/, /_not-found, /api/order, /passport, /passport/[orderNumber])
```

**E2E, живой прогон на production build (`next start`), проверено вживую в браузере, не только по коду:**

| Flow | Результат |
|---|---|
| 1. Lot → Coffee Passport CTA | Подтверждено: ссылка **не рендерится**, потому что `NEXT_PUBLIC_COFFEE_PASSPORT_LOT_URL_TEMPLATE` не задан — честное поведение, не забытая функция. |
| 2. QR concept (URL correctness) | Функция строит URL из существующего `lot.id` без придуманной структуры маршрута — корректно спроектирована, но не может быть протестирована end-to-end без реального шаблона. |
| 3. Cart сохраняет Lot ID | Подтверждено: `localStorage.xo-coffee-cart[0].id === "lot-014"`. |
| 4. Checkout → OrderPayload сохраняет Lot ID | Подтверждено перехватом `fetch`: реальный POST body на `/api/order` содержит `"lotId":"lot-014"`. |
| 5. Confirmation не теряет информацию о Lot | Подтверждено: `localStorage.xo-coffee-orders[0].items[0].lotId === "lot-014"` (это поле уже существовало и не потерялось). |
| 6. Guest без регистрации | Подтверждено архитектурно для просмотра Lot (Catalog/LotPassportModal не требуют авторизации — её в XO COFFEE вообще нет); **не подтверждено** для tasting без покупки — см. раздел 8, это ограничение Coffee Passport, не XO COFFEE. |
| 7. Existing Coffee Passport user | Не применимо к XO COFFEE — у XO COFFEE нет понятия аккаунта Coffee Passport, которое можно было бы «не создать заново»; сам вопрос принадлежит Coffee Passport-платформе. |

**Regression:** полный прогон Catalog → Lot Passport → Add to Cart → Cart → Checkout → Payment → Confirmation → встроенный Coffee Passport (`/passport/XO-913237`) → 0 console-ошибок, 0 изменений видимого поведения кроме подтверждённого добавления `lotId` в сетевой payload.

---

## 12. Remaining risks

Не маскирую ничего:

1. **Главный риск — тот же, что и в разделе 8.** Целевой продуктовый сценарий (QR → анонимный tasting → опциональная регистрация) не может заработать, пока Coffee Passport (внешняя платформа или будущая переработка встроенной фичи) не получит lot-scoped, не привязанный к заказу способ сохранить впечатление. XO COFFEE со своей стороны готов (стабильный `Lot.id`, централизованный URL-builder, Lot ID сохранён через весь чекаут) — но мост подключить некуда, пока это не решено на стороне Coffee Passport.
2. **Реальный URL Coffee Passport платформы неизвестен.** `NEXT_PUBLIC_COFFEE_PASSPORT_LOT_URL_TEMPLATE` не задан ни в одном `.env`. Как только он появится, CTA в `LotPassportModal.tsx` заработает без дополнительных изменений кода.
3. **Экспериментальный Supabase foundation (commit `b316403`) остаётся в репозитории.** Он изолирован и не подключён, но занимает место и может ввести в заблуждение будущего разработчика, если не удалить его явным, осознанным решением владельца (не автоматически в рамках этой задачи).
4. **`CartItem.id`/`OrderPayloadItem` называют Lot ID по-разному** (`id` в одном месте, `lotId` в другом) — работает корректно везде, но при дальнейшей интеграции с Coffee Passport стоит helped явно документировать, а не унифицировать молча (сделано в этой сессии — комментарии добавлены в `order.ts`).

---

## Итог: код изменён

Файлы:
- `src/types/order.ts` — добавлено поле `lotId` в `OrderPayloadItem`.
- `src/components/cart/PaymentStep.tsx` — `lotId: item.id` в payload.
- `src/lib/coffeePassportLink.ts` — новый файл, централизованный URL-builder.
- `src/components/LotPassportModal.tsx` — условный (сегодня скрытый) CTA-переход на Coffee Passport.

Экспериментальный Supabase foundation (`supabase/`, `src/lib/supabase/`, `src/types/domain.ts`, `.env.example`, `.gitignore`-правка из commit `b316403`) — не тронут, явно помечен как experimental/superseded в разделе 10, не удалён.
