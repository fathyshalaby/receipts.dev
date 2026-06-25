# CLAUDE.md

Guidance for AI assistants (Claude Code and others) working in this repository.

## What this is

**Receipts** makes a coding agent *prove its work*. It produces a **receipt**: one
self-contained artefact a human can judge in ~90 seconds — a recorded Playwright
visual-QA walkthrough **+** the reasoning behind a PR **+** an expected-vs-actual
view per acceptance claim.

Philosophy: incumbents make AI *review the PR*; Receipts makes the agent *prove
its work* so a human can **watch the work**. It **documents and demonstrates** —
it does **not** critique code or emit review comments. That non-goal is
deliberate; do not add "AI code reviewer" behavior.

Shipped three ways:
- **CLI** — `receipts qa | build | open | publish | login | tokens` (the engine).
- **Claude Code plugin** — `.claude-plugin/` bundling the `receipts` skill.
- **Web gallery** — `web/`, a Next.js app (marketing landing + hosted review).

> Note on naming: the repo directory is `receipts.dev` and the GitHub remote is
> `fathyshalaby/receipts.dev`, but `package.json`/README still reference the
> historical `fathyshalaby/nuro` slug and publish to npm as
> **`@fathyshalaby/receipts`** (the bare `receipts` name was taken). Don't
> "fix" these references unless asked — they're load-bearing for npm/plugin.

## Repository layout

```
receipts/scripts/      # The CLI (TypeScript, run via tsx — NO build step)
  cli.ts               #   entry/dispatch; bin/receipts.js shells into this
  qa.ts                #   `qa`: boot app, drive Playwright per claim, record, judge
  build.ts             #   `build`: merge → manifest.json → render index.html
  report.ts            #   self-contained HTML renderer (inline CSS/JS)
  judge.ts             #   vision-LLM verdict per claim (Anthropic API)
  nav.ts               #   LLM-driven navigation from a plain-language navigationHint
  open.ts              #   `open`: open the report
  publish.ts           #   `publish`: upload to Supabase (BYO or hosted)
  login.ts / tokens.ts #   `login/logout/whoami`; operator `tokens issue|revoke|list`
  credentials.ts       #   ~/.receipts/config.json store; env always overrides
  types.ts             #   DATA CONTRACTS — the spine; shared by qa/build/report
  util.ts              #   logging, flag parser, receiptId, git info, esc, versions
receipts/assets/report.css   # styles inlined into the report at build time
skills/receipts/       # the Claude skill (SKILL.md + references/schemas.md)
.claude-plugin/        # plugin.json + marketplace.json (Claude Code plugin)
web/                   # Next.js 15 gallery + landing page (separate package)
supabase/              # migration 0001_receipts.sql + functions/ingest edge fn
examples/              # demo app (server.mjs) + receipt-input.json fixture
__tests__/unit.test.ts # vitest unit tests (pure functions only)
.github/workflows/     # receipts.yml (PR template), release.yml
bin/receipts.js        # published bin shim
docs/                  # hosting.md + SVG assets
```

## Commands

Root package (the CLI — Node ≥ 18.18):

```bash
npm install
npx playwright install chromium      # one-time, pinned Chromium

npm test                 # vitest --run  (the full test suite)
npm run typecheck        # tsc --noEmit  (tsconfig includes only receipts/scripts)
npm run receipts -- ...  # run the CLI from source via tsx
npm run demo             # end-to-end: qa (--no-judge) → build → open the demo
npm run demo:serve       # boot just the example app
```

`prepublishOnly` runs `typecheck` + `test` — both must pass before publishing.

CLI surface (also `npx receipts <cmd>` once installed):

```
receipts qa      --input receipt-input.json [--url URL] [--start "CMD"] [--no-judge] [--out DIR]
receipts build   --in .receipts/<id>
receipts open    --in .receipts/<id>
receipts publish --in .receipts/<id> [--visibility unlisted|public] [--dry-run]
receipts login   --token <T> | --supabase-url <U> --supabase-key <K>   ·   logout · whoami
receipts tokens  issue|revoke|list        (operator — hosted mode)
```

Web app (`cd web` — its own package.json):

```bash
npm install && npm run dev      # http://localhost:3000
npm run build | start | lint | typecheck
```

## The pipeline & data flow

The product is a 3-stage pipeline; `types.ts` defines every contract between
stages — change a shape there and update `qa`, `build`, and `report` together.

1. **Agent writes `receipt-input.json`** (`ReceiptInput`) — the intent/reasoning
   half: task, branch, `targetUrl`, optional `startCommand`,
   `acceptanceCriteria[]`, `plan`, `decisions`, `rejectedAlternatives`,
   `promptLog`, `filesChanged`. This is *your* job when running the skill.
2. **`receipts qa`** → `qa-results.json` (`QaResults`). Boots the app (if
   `startCommand`), drives Playwright per claim (`recordVideo` + tracing),
   captures before/after screenshots, and — with `RECEIPTS_API_KEY` — asks a
   vision model for a `pass|fail|inconclusive` verdict per claim.
3. **`receipts build`** → `manifest.json` (`Manifest`, the single source of
   truth) → renders self-contained `index.html` (inline CSS/JS, media by
   relative path, **no network/CDN**).
4. *(optional)* **`receipts publish`** → Supabase + `publish.json`
   (`reportUrl` / `videoUrl`) for a shareable PR link.

Output folder:

```
.receipts/<id>/
├── index.html  manifest.json  receipt-input.json  qa-results.json  [publish.json]
└── media/      session.webm  before/after screenshots  trace.zip
```

`<id>` is `pr-<n>` when a PR number exists, else a sanitized branch name
(see `receiptId` in `util.ts`).

### Navigation modes per claim (`qa.ts` + `nav.ts`)
- A claim with deterministic `steps[]` (goto/click/fill/press/hover/select/wait)
  runs them as-is. **Author-provided steps always win.**
- A claim with only a `navigationHint` (prose) is reached by **LLM-driven
  navigation**: `nav.ts` asks the model to plan `QaStep`s from the hint + a
  snapshot of interactive elements, validated against an allow-list (`MAX_STEPS`,
  `parseNavSteps` drops disallowed actions). Gated on `RECEIPTS_API_KEY`.

### Verdicts & exit codes (CI gate)
- `qa` exits **non-zero** if any claim **fails or is inconclusive**.
- **Reasoning-only** (no acceptance criteria / no `targetUrl`) and
  **visual-only** (no API key) runs exit **0**.
- `overallVerdict` in `build.ts`: `reasoning-only` → `fail` (any fail/inconc) →
  `pass` (all pass) → `visual-only` (everything `not_tested`).

### Graceful degradation — preserve this
- **Backend/API-only PR**: emit a reasoning-only receipt, never hard-fail.
- **No `RECEIPTS_API_KEY`**: visual-only receipt (verdicts `not_tested`); still
  valid. `--no-judge` makes this explicit and silences the warning.

## Conventions

- **No build step for the CLI.** TypeScript runs directly via `tsx`. Don't add a
  bundler/compile output for `receipts/scripts/`. ESM throughout (`"type":
  "module"`), `.ts` imports without extensions, Node built-ins via `node:` prefix.
- **`types.ts` is the spine.** All cross-stage data flows through it. Keep
  `schemaVersion: "1"` literals consistent. `web/lib/types.ts` is a separate,
  looser mirror of the manifest for the read-only gallery — keep it in sync when
  the manifest shape changes.
- **The report is self-contained.** `report.ts` inlines `report.css` and emits
  no network calls, no CDN, no `localStorage`. Keep it openable from `file://`.
- **Logging** goes through `log` in `util.ts` (`info/warn/err/ok`, `[receipts]`
  prefix). Flag parsing uses `parseFlags` — a minimal `--flag value` / `--bool`
  parser; don't pull in a CLI framework.
- **Credentials**: env vars *always* override `~/.receipts/config.json` (so CI
  stays env-driven). The file is `0600` and never committed. Raw upload tokens
  are never stored — only `sha256` (`tokens.ts` / `api_keys` table).
- **Receipts are gitignored** (`.receipts/`). CI artefact is the canonical
  delivery; `git add -f .receipts/<id>` to put one in a PR diff.
- **Acceptance claims must be observable, falsifiable, and provable from pixels.**
  Prefer "A success toast with text 'Saved' is visible" over "saving works".

### Web app conventions
- Next.js 15 App Router · React 19 · TypeScript. **Hand-authored CSS**
  (`app/globals.css`, `app/landing.css`) — no Tailwind, no UI library.
- The gallery is **read-only**: it only ever READs `public.receipts` under RLS
  (`owner_id = auth.uid()` + public/unlisted policies). It never writes receipts
  — `receipts publish` (service-role) does. Don't add write paths here.
- Supabase auth via `@supabase/ssr` (cookie sessions, magic-link). Browser uses
  the anon key only (RLS protects data); no service-role key in the web app.
  Client/server split: `web/lib/supabase/client.ts` vs `server.ts`;
  `middleware.ts` refreshes the session and guards `/` and `/r/*`.

## Environment variables

| Var | Purpose |
|---|---|
| `RECEIPTS_API_KEY` | Anthropic key for the vision judge + LLM nav. Omit → visual-only. |
| `RECEIPTS_MODEL` | Judge/nav model id (default `claude-sonnet-4-6`). |
| `RECEIPTS_SUPABASE_URL` / `RECEIPTS_SUPABASE_KEY` | Publish (BYO): project URL + service-role key. |
| `RECEIPTS_TOKEN` / `RECEIPTS_INGEST_URL` | Publish (hosted): upload token + ingest endpoint. |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Web app only (anon, RLS-protected). |

No telemetry. The only network calls are the optional LLM judge/nav and
`receipts publish` (to the Supabase you point it at).

## Hosting (Supabase, optional — Phase 2)

`supabase/migrations/0001_receipts.sql` defines `api_keys` + `receipts` tables,
RLS, and the `receipts` storage bucket. Two publish modes share this schema:
- **BYO** — `receipts publish` writes directly with the service-role key.
- **Hosted** — the CLI POSTs `supabase/functions/ingest` with a bearer token;
  the edge function holds the service key so end users never do.

Full setup + ingest protocol: `docs/hosting.md`.

## Testing

`__tests__/unit.test.ts` (vitest, node env) covers **pure, exported functions**
only — `parseNavSteps`, `buildNavPrompt`, `selectMode`, `resolveCredentials`,
`receiptId`, `sha256Hex`. No browser/network in unit tests. When you add a pure
helper to the pipeline, export it and add a case here. Run `npm test`.

## Working agreements

- Run `npm run typecheck && npm test` before considering CLI work done.
- Keep the three distribution surfaces in sync when contracts change: CLI
  (`types.ts`), skill (`skills/receipts/references/schemas.md`), web
  (`web/lib/types.ts`).
- Don't break the self-contained / offline guarantees of the report, the
  graceful-degradation modes, or the "documents, never critiques" non-goal.
- Develop on the branch you were assigned; commit with clear messages; push only
  when asked. **Do not open a PR unless explicitly requested.**
