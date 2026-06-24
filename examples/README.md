# Example — task-list demo

A zero-dependency demo so the receipt flow works out of the box.

- `demo-app/index.html` — a tiny vanilla task list (heading, empty state, add-task).
- `demo-app/server.mjs` — a zero-dependency static server (defaults to port 3000).
- `receipt-input.json` — a sample receipt input with three observable claims.

## Run it

From the repo root, with dependencies installed (`npm install` and
`npx playwright install chromium`):

```bash
# qa boots the demo server itself (startCommand in receipt-input.json),
# drives Playwright across the three claims, then tears the server down.
npx receipts qa --input examples/receipt-input.json --no-judge

# build the self-contained report
npx receipts build --in .receipts/demo-task-list

# open it (or just open .receipts/demo-task-list/index.html in a browser)
npx receipts open --in .receipts/demo-task-list
```

Drop `--no-judge` and set `RECEIPTS_API_KEY` to get LLM-judged pass/fail verdicts
per claim.

The receipt id is `demo-task-list` (sanitized from the `branch` field, since
`prNumber` is null).
