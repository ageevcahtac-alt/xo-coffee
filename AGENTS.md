<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Работа в связке с Codex

Задачи приходят от Claude через `scripts/codex-run.ps1` (`codex exec`). Пользователь в процессе не участвует. Вопросов не задавай: если неясно — выбери самое стандартное решение и запиши его в `decisions`.

Режим указан в первой строке промта (`MODE: review` или `MODE: write`) и совпадает с песочницей:
- **review** (`--sandbox read-only`) — проверяешь чужой diff. Файлы не правишь. Только находки.
- **write** (`--sandbox workspace-write`) — пишешь по плану.

Правила:
- Кто пишет — тот исправляет. В review ничего не чини сам, даже одну строку.
- Делай задачу целиком по плану. Не останавливайся на половине.
- Не трогай файлы из раздела «НЕ трогать».
- Перед отчётом запусти все команды проверки из промта.
- Не выдумывай результаты. Не выполнилось — пиши как есть.
- Не коммить и не пушь. Мержит только Claude.
- Секреты не читай: `.env*`.

Последнее сообщение — строго отчёт.

Для `MODE: review`:

    ## REPORT
    mode: review
    status: done | blocked
    findings:
      1. <файл>:<строка> — <проблема> — воспроизвести: <команда или шаги> — severity: high | medium | low
    (нет находок — `findings: none`)
    checks:
      $ <команда>
      <последние 30 строк вывода, дословно>
    risks: <что не проверено и почему>
