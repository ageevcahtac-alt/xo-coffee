# REGISTRY — журнал изменений XO Store

Журнал ведётся по образцу репозитория Coffee Passport (docs/reports/):
одна запись на изменение, факты без домыслов, проверки — командами, не
«на глаз». Новые записи — сверху.

Формат записи: дата → ветка/PR → что/почему → проверки → ревью → риски.

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

**Ревью:** Codex (scripts/codex-run.ps1, MODE: review, песочница read-only) —
`findings: none`, раунд 1 из 2. Отчёт: .agents/runs/maroon-bg-review/report-1.md
(артефакт локальный, в git не коммитится).

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
