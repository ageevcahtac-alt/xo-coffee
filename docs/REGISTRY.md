# REGISTRY — журнал изменений XO Store

Журнал ведётся по образцу репозитория Coffee Passport (docs/reports/):
одна запись на изменение, факты без домыслов, проверки — командами, не
«на глаз». Новые записи — сверху.

Формат записи: дата → ветка/PR → что/почему → проверки → ревью → риски.

---

## 2026-11-08 — fix/remove-local-cabinet-passport-handoff (master напрямую)

**Что:** (1) Локальный кабинет убран из навигации и клиентского пути:
«Мой кофе» удалён из NAV_LINKS (остались «Каталог», «Подход»); роуты
`/passport` и `/passport/[orderNumber]` удалены вместе с компонентами
`passport/*` (MyCoffeePage, CoffeePassportPage, CoffeePassportDetail);
викторина Discovery («Подобрать кофе») удалена целиком — DiscoveryModal,
DiscoveryContext, src/lib/discovery.ts, точки входа в Hero и Catalog;
локальные дегустации убраны из LotPassportModal («Вы уже пробовали этот
кофе») и из ранжирования каталога; локальные записи заказов/дегустаций в
localStorage больше не пишутся (CartDrawer не вызывает saveOrderRecord);
src/lib/coffeePassport.ts сокращён до mergeOrderItemsByLot (сводка состава
на success-экране), типы — до OrderRecordItem. Покрытие единственного
сохранённого сиама вынесено в src/lib/coffeePassportLink.test.ts и
src/lib/coffeePassport.test.ts (старые passportHandoff/passportIdentity
тесты удалены вместе с passportContinuation/passportHandoff/personalTaste).
Данные в уже существующих браузерах не трогаются; БД и миграции не
менялись. (2) Success-экран после тестовой оплаты: номер заказа, состав
позиций с суммой (OrderDetails обогащён полем total — клиентский снапшот,
серверный контракт заказа не менялся), честная пометка по способу оплаты
(карта — тестовый режим без списания; СБП/счёт — реквизиты направим после
подтверждения), контакты поддержки из Footer вместо обещания
«чек и трек-номер придут на email» (авто-писем в проекте нет). Плашка
«Готовность заказа удобно отслеживать в Coffee Passport» с CTA
«Отслеживать заказ в Coffee Passport» → https://coffeepassport.ru (обычная
ссылка, без автопереадресации). Телефон и email по-прежнему уходят в
данные заказа (customer_contact в Admin-запросе, тест K orderFlow).

**Почему:** задача владельца «убрать локальный кабинет, после тестовой
оплаты вести в настоящий Coffee Passport». Локальный псевдо-Паспорт
(/passport/*) не выдаётся за Coffee Passport; личный кабинет — только
внешний coffeepassport.ru.

**Не тронуто (сознательно):** каталог, карточка лота, корзина, создание
заказа и передача в Admin, серверный контракт заказа, Telegram-уведомления
байт-в-байт, sandbox-оплата (тестовая карта, декоративный QR), ссылка
«Coffee Passport этого лота» в LotPassportModal (ведёт в настоящий
паспорт лота через getCoffeePassportUrl), эквайринг/фискализация,
API-match с Coffee Passport, вкладка «Мои заказы».

**Проверки:** `npm test` 99/99 ✓ · `npm run lint` чисто ✓ · `npm run build` ✓
(роуты: /, /_not-found, /api/order — /passport нет) · smoke `next start`:
GET / 200, «Мой кофе»/«Подобрать кофе»/«Не знаю, что выбрать»/ссылок
/passport в HTML нет, GET /passport → 404 ✓.

**Ревью:** не запускалось (по задаче владельца: без Codex и отдельного
review-цикла).

**Риски:** низкие; откат — revert одного коммита. Сосуществование с
не вмерженной fix/post-purchase-passport-handoff (PR #3): там те же
участки OrderSuccess/PaymentStep — при её мерже потребуется разрешить
конфликт в пользу этой версии (плашка ведёт на корень coffeepassport.ru).

---

## 2026-11-05 — chore/remove-maroon-bg → PR #1

**Что:** остаточные сырые бордовые фоновые классы (`bg-burgundy`,
`bg-burgundy-dark`) в 9 компонентах переведены на семантические токены P27
(`bg-accent`, `bg-accent-hover`). Визуальных изменений нет
(`--color-accent` = `--color-burgundy` #3b1119, `--color-accent-hover` =
`--color-burgundy-dark` #260b10, app/globals.css).

**Почему:** задача владельца «убрать устаревший бордовый фон». Разведка
показала: старый полноэкранный бордовый фон (FixedBackdrop) удалён ещё в
P27; актуальная палитра — P26 направление B «Refined Burgundy Specialty»,
где бордовый — намеренный брендовый акцент (упаковка Pure Roast). Устаревшим
оставался только сырой слой токенов поверх семантического.

**Не тронуто (сознательно):** шапка `bg-backdrop/90` (P27: «сознательно
оставленный тёмный якорь»), тёмные секции Manifest/Footer (`bg-surface-accent`),
текст/бордеры `text-burgundy`/`border-burgundy` (не фоны).

**Проверки:** `npm test` 116/116 ✓ · `npm run lint` чисто ✓ · `npm run build` ✓ ·
grep `bg-burgundy|bg-burgundy-dark|bg-maroon` по src/+app/ — 0 вхождений ✓

**Ревью:** Codex (scripts/codex-run.ps1, MODE: review, песочница read-only), 2
раунда — в обоих `findings: none`. Отчёты: .agents/runs/maroon-bg-review/report-1.md,
report-2.md (артефакты локальные, в git не коммитятся).

**Контраст:** цвета не менялись — действуют результаты P28/P29 (cream на
burgundy ≈ 11.5:1, выше WCAG AA 4.5:1).

**Риски:** низкие; откат — revert одного коммита (a0e9969). Визуальный
эффект нулевой, верификация — кодом, не скриншотами.

**Ссылки:** PR https://github.com/ageevcahtac-alt/xo-coffee/pull/1

---

## 2026-11-05 — инфраструктура Codex-ревью

**Что:** scripts/codex-run.ps1 (копия образца из Coffee Passport: режимы
review/write, артефакты в .agents/runs/<id>/), записи `.agents/` в .gitignore,
блок «Работа в связке с Codex» в AGENTS.md.

**Почему:** в репозитории магазина Codex-инфраструктуры не было, хотя
процесс ревью через scripts/codex-run.ps1 принят в экосистеме (паспорт).

**Проверки:** скрипт статически проверен; прогон — самим ревью выше (exit 0,
отчёт по формату).

**Риски:** CODEX_ARGS/CODEX_BIN требуют доверенного окружения (тот же риск,
что и в паспорте).
