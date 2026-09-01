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

Shipped four ways:
- **CLI** — `receipts qa | build | embed | open | publish | login | tokens` (the engine).
- **Claude Code plugin** — `.claude-plugin/` bundling the `receipts` skill (`skills/receipts/`).
- **Cursor Cloud skill** — `.cursor/skills/receipts/` (same Demo Check workflow, so Origin/Cloud agents load it).
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
  embed.ts             #   `embed`: Origin/GitHub Walkthrough (Demo Check) for the PR
  github-attach.ts     #   upload session.mp4 to GitHub user-attachments (native player)
  media.ts             #   optional ffmpeg H.264 transcode (session.webm → session.mp4)
  build.ts             #   `build`: merge → manifest.json → render index.html
  report.ts            #   self-contained HTML renderer (inline CSS/JS)
  judge.ts             #   vision-LLM verdict per claim (Anthropic API)
  nav.ts               #   LLM-driven navigation from a plain-language navigationHint
  open.ts              #   `open`: open the report
  publish.ts           #   `publish`: upload to Supabase (BYO or hosted)
  verify.ts            #   `verify`: recompute integrity hashes / HMAC — tamper check
  doctor.ts            #   `doctor`: local preflight (Node, Chromium launches, API key)
  integrity.ts         #   tamper-evidence: canonical hashing + HMAC (pure helpers)
  login.ts / tokens.ts #   `login/logout/whoami`; operator `tokens issue|revoke|list`
  credentials.ts       #   ~/.receipts/config.json store; env always overrides
  types.ts             #   DATA CONTRACTS — the spine; shared by qa/build/report
  util.ts              #   logging, flag parser, receiptId, git info, esc, versions
receipts/assets/report.css   # styles inlined into the report at build time
skills/receipts/       # the Claude skill (SKILL.md + references/schemas.md)
.cursor/skills/receipts/  # Cursor Cloud copy of the same skill (Demo Check on Origin PRs)
.claude-plugin/        # plugin.json + marketplace.json (Claude Code plugin)
web/                   # Next.js 15 gallery + landing page (separate package)
supabase/              # migration 0001_receipts.sql + functions/{ingest,_shared}
examples/              # demo app (server.mjs) + receipt-input.json fixture
__tests__/             # unit.test.ts (pure fns) + e2e.test.ts (golden pipeline)
.github/workflows/     # ci.yml (typecheck+test gate), receipts.yml (this
                       #   repo's own QA+build+PR-comment pipeline), release.yml
bin/receipts.js        # published bin shim
docs/                  # hosting.md + SVG assets
```

> No `receipt-input.json` lives at repo root by default — `receipts.yml` only
> generates a receipt for a PR that commits one there, and it must be removed
> (or updated) once that PR merges. See the footgun note under GitHub Actions
> workflows below.

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
receipts qa      --input receipt-input.json [--url URL] [--start "CMD"] [--contract claims.json] [--no-judge] [--no-adversarial] [--max-judge-calls N] [--out DIR]
receipts build   --in .receipts/<id>
  receipts embed   --in .receipts/<id> [--format origin|github] [--artifacts-dir DIR] [--media-base URL] [--github-repo owner/repo] [--out FILE]
receipts verify  --in .receipts/<id> [--key <K>]
receipts doctor
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
4. **`receipts embed`** → Walkthrough markdown/HTML for the PR (Origin-native
   `<video>`/`<img>` in the body, or a GitHub comment). This is the Demo Check
   surface — what Origin already shows, now on GitHub and everywhere else.
5. *(optional)* **`receipts publish`** → Supabase + `publish.json`
   (`reportUrl` / `videoUrl`) for a shareable PR link.

Output folder:

```
.receipts/<id>/
├── index.html  manifest.json  receipt-input.json  qa-results.json  [publish.json]
└── media/      session.webm  [session.mp4]  [session.gif]  before/after screenshots  trace.zip
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

### Judging (`judge.ts`)
- The judge sees the **chronological frame sequence** per claim (before → per-step
  → after, captured in `qa.ts` via the `onStep` hooks), not just before/after.
- **Adversarial pass:** any `pass` is re-checked by a second judge prompted to
  *refute* it; a refutation downgrades `pass → inconclusive` (`reconcileVerdict`,
  pure + unit-tested). Bound to passing claims only (cost). `--no-adversarial`
  disables it. Don't remove this without flagging — it's the counter to the
  "agent grades its own homework" critique.

### Provenance, integrity & cost (the "would a senior dev trust it?" layer)
- **Claims as a contract:** `qa --contract claims.json` merges independently
  authored criteria (tagged `source: contract`) over the agent's input claims
  (`source: agent`). `mergeCriteria` is pure + unit-tested. The report shows a
  per-claim provenance chip and flags a fully self-graded run.
- **No wrong-screen passes:** if LLM nav ran fewer steps than planned, a `pass`
  is downgraded to `inconclusive` (`qa.ts`).
- **Cost ceiling:** `--max-judge-calls` / `RECEIPTS_MAX_JUDGE_CALLS` caps
  vision-model calls; remaining claims degrade to `not_tested` with a note.
- **Trace-on-failure-only:** a clean run prunes `trace.zip`.
- **Tamper-evidence (`integrity.ts` + `build` + `verify`):** `build` writes an
  `integrity` block to the manifest — sha256 of the canonical manifest data +
  every evidence file (excluding `index.html`/`manifest.json`/`publish.json`),
  optionally HMAC-signed with `RECEIPTS_SIGNING_KEY`. `receipts verify`
  recomputes and exits non-zero on any edit. Keep the EXCLUDE set and the
  signature payload stable, or you'll break verification of existing receipts.

### Verdicts & exit codes (CI gate)
- `qa` exits **1** if any claim **fails or is inconclusive** — expected content
  to report, not an infra problem; `receipts build` should still run.
- `qa` exits **2** on an **infra failure** (missing `receipt-input.json`/
  contract file, malformed contract, app never booted, browser failed to
  launch) — no receipt exists for this commit; treat this as a hard failure,
  distinct from exit 1 (`receipts.yml` does exactly this: `exit 1` the job on
  a `2`, but proceeds to `build` on a `1`).
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
- **A claim `id` is untrusted input** — `--contract` claims come from a file
  authored outside the agent. Never interpolate `c.id` straight into a
  filesystem path; always run it through `safeFileToken` (`util.ts`) first,
  as `qa.ts` does for every `media/<id>-*.png` write.

### Web app conventions
- Next.js 15 App Router · React 19 · TypeScript. **Hand-authored CSS**
  (`app/globals.css`, `app/landing.css`) — no Tailwind, no UI library.
- The gallery is **read-only**: it only ever READs `public.receipts` under RLS
  (`owner_id = auth.uid()` + public/unlisted policies). It never writes receipts
  — `receipts publish` (service-role) does. Don't add write paths here.
- Supabase auth via `@supabase/ssr` (cookie sessions, magic-link). Browser uses
  the anon key only (RLS protects data); no service-role key in the web app.
  Client/server split: `web/lib/supabase/client.ts` vs `server.ts`;
  `middleware.ts` refreshes the session on every matched request and guards
  `/gallery` (+`/gallery/*`) and `/r/*` — redirecting signed-out users to
  `/login`. **`/` (the marketing landing) stays public.**
- Routes: `/` marketing landing (`app/page.tsx` + `landing.css`) · `/login`
  magic-link sign-in · `/auth/callback` Supabase auth callback · `/gallery`
  the signed-in user's own receipts (list, owner-scoped) · `/r/[id]` a single
  receipt detail view (embeds the report + video link).

## Environment variables

| Var | Purpose |
|---|---|
| `RECEIPTS_API_KEY` | Anthropic key for the vision judge + LLM nav. Omit → visual-only. |
| `RECEIPTS_MODEL` | Judge/nav model id (default `claude-sonnet-4-6`). |
| `RECEIPTS_CHROMIUM_PATH` | System Chrome/Chromium binary; fallback when the pinned Playwright build isn't installed. |
| `RECEIPTS_MAX_JUDGE_CALLS` | Cost ceiling: max vision-model calls per run (0/unset = unlimited). |
| `RECEIPTS_SIGNING_KEY` | HMAC key — `build` signs the receipt, `verify` checks it. |
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
  `supabase/functions/_shared/cors.ts` has the shared `corsHeaders`, a `json()`
  response helper, and the `sha256Hex` used to match a bearer token against
  `api_keys.token_hash`.

Full setup + ingest protocol: `docs/hosting.md`.

## GitHub Actions workflows

- **`ci.yml`** — the test gate: on push to `main`, every PR, and dispatch,
  installs deps + pinned Chromium, then `npm run typecheck && npm test`.
- **`receipts.yml`** — **not a generic template; a pipeline specific to this
  repo's own `web/` app under test.** On a PR: checks out the actual branch
  tip (not the detached merge ref, so it can push back), installs root +
  `web/` deps, and — only if `receipt-input.json` exists at repo root (else a
  `::notice::` and skip) — runs `receipts qa`. `NEXT_PUBLIC_SUPABASE_URL`/
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` are passed through even though this workflow
  never publishes, because `web/middleware.ts` 500s without them. Exit code
  `2` from `qa` hard-fails the job; exit `1` (failing/inconclusive claims)
  still proceeds to `build`. It then transcodes `session.webm` → a GIF (and
  H.264 `session.mp4` when missing) via `ffmpeg`, rebuilds, and **`git add -f`s
  + commits the receipt straight onto the PR branch** (`chore: update receipt
  preview [skip ci]`) — that commit is what the PR comment's embedded
  GIF/screenshots read from, not a placeholder. The comment body is generated
  by `receipts embed --format github`: it uploads `session.mp4` to GitHub
  user-attachments for a native player when the token can mint one, else an
  HTML `<video>` tag (GitLab) plus a GIF (GitHub GFM fallback). **Deliberately does not publish to
  Supabase** (see the workflow's own header comment) — always uploads the
  receipt dir as a fallback artefact, and falls back to an artefact-only
  comment on fork PRs (`GITHUB_TOKEN` can't push to a fork branch).
  `timeout-minutes: 15` guards against a hung `ffmpeg`/dev-server process.
  > **Footgun (documented in `SKILL.md`):** the presence check only looks for
  > `receipt-input.json` at repo root. If one is committed there for a PR and
  > never removed after merge, every subsequent PR's CI keeps regenerating
  > *that stale PR's* receipt instead of skipping or reflecting the new
  > branch. Remove (or update) the root `receipt-input.json` once its PR
  > merges — don't leave it as a permanent fixture.
- **`release.yml`** — on a `v*.*.*` tag (or dispatch): typecheck + test, then
  `npm publish` (npm provenance via `id-token: write`) and a GitHub Release
  with auto-generated notes.

## Testing

`__tests__/unit.test.ts` (vitest, node env) covers **pure, exported functions**
only — `parseNavSteps`, `buildNavPrompt`, `selectMode`, `resolveCredentials`,
`receiptId`, `safeFileToken`, `sha256Hex`, `reconcileVerdict`, `sampleFrames`,
`mergeCriteria`, `canonicalize`, `hmacSha256Hex`, `computeManifestHash`,
`signaturePayload`. No browser/network in unit tests. When you add a pure
helper to the pipeline, export it and add a case here.

`__tests__/e2e.test.ts` is the **golden integration test** (two cases): it boots
the demo, runs the real `qa → build → verify` in a browser, and asserts the
manifest, verdict, frames, integrity, and tamper-detection; the second case
signs a receipt with `RECEIPTS_SIGNING_KEY` and asserts `verify` passes with the
right key and fails with the wrong one. It **self-skips when no browser can
launch** (so plain `npm test` passes locally); `ci.yml` installs Chromium and
runs it on every PR. Run `npm test`.

## Working agreements

- Run `npm run typecheck && npm test` before considering CLI work done.
- Keep the three distribution surfaces in sync when contracts change: CLI
  (`types.ts`), skill (`skills/receipts/references/schemas.md`), web
  (`web/lib/types.ts`). Keep `.cursor/skills/receipts/SKILL.md` in lockstep
  with `skills/receipts/SKILL.md` (Cursor Cloud vs Claude plugin).
- Don't break the self-contained / offline guarantees of the report, the
  graceful-degradation modes, or the "documents, never critiques" non-goal.
- Develop on the branch you were assigned; commit with clear messages; push only
  when asked. **Do not open a PR unless explicitly requested.**
- Check `ROADMAP.md` before adding a feature — most of the adversarial-review
  gap list is already shipped (✅), but a few items are tracked as still open
  (⬜/🟡): per-claim verdict caching across runs, JPEG (vs PNG) screenshots to
  cut receipt weight, a live hosted example receipt linked from the README,
  and the deeper landing-page rewrite.
