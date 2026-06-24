# Receipts — watch the work

> Incumbents make AI **review the PR**. Receipts makes the agent **prove its work** so a human can judge it.
> **"Review the thinking" → "Watch the work."**

A Claude skill (and CLI) that makes a coding agent leave **receipts**: a recorded
visual-QA walkthrough + the reasoning behind every PR, packaged as **one
self-contained artefact a human can judge in ~90 seconds.**

A receipt is a folder you can open with no server, no account, no hosting:

```
.receipts/<id>/
├── index.html         ← open this (file://, no network)
├── manifest.json      ← single source of truth
├── receipt-input.json ← what was asked + how the agent reasoned
├── qa-results.json    ← per-claim verdicts
└── media/             ← session.webm, before/after screenshots, trace.zip
```

The report leads with the **video** (watch the work), then **expected-vs-actual**
per acceptance claim, then **how the agent thought** (plan, decisions, rejected
alternatives, prompt log), then files changed.

<!-- TODO: add docs/receipt.gif — a screen capture of a real receipt scrolling. -->
<!-- ![A Receipts report](docs/receipt.gif) -->

## Why

Coding agents ship large PRs fast, often 5–20 in parallel. The bottleneck moved
from writing code to reviewing it. A reviewer opens an agent's PR and gets a diff
and maybe a text summary — no view of how the agent approached the task, whether
it QA'd the result, or how the working software actually looks. So review is
either slow or a rubber stamp.

Existing tools either **review the code** (CodeRabbit, Qodo, Greptile, Bugbot),
**show reasoning with no visual proof**, or **lock replay to one agent's
platform**. Receipts packages recorded visual QA **+** reasoning **+**
expected-vs-actual as a tool-agnostic, self-hostable artefact attached to the PR.

## Quickstart (5 minutes)

```bash
git clone <this-repo> && cd <this-repo>
npm install
npx playwright install chromium

# Run the bundled demo end-to-end (boots a tiny app, QAs 3 claims, builds report):
npx receipts qa --input examples/receipt-input.json --no-judge
npx receipts build --in .receipts/demo-task-list
npx receipts open  --in .receipts/demo-task-list
```

That produces `.receipts/demo-task-list/index.html` — open it in any browser.
Add `RECEIPTS_API_KEY` (Anthropic) and drop `--no-judge` to get LLM-judged
pass/fail verdicts per claim.

### On your own project

1. Have your agent write a `receipt-input.json` (schema:
   [`pr-receipts/references/schemas.md`](pr-receipts/references/schemas.md)) with
   the task, plan, decisions, and **falsifiable acceptance claims**.
2. `npx receipts qa --input receipt-input.json` (set `startCommand`/`targetUrl`
   in the input, or pass `--url`).
3. `npx receipts build --in .receipts/<id>` then open `index.html`.

## CLI

```
receipts qa     --input receipt-input.json [--url URL] [--start "CMD"] [--no-judge] [--out DIR]
receipts build  --in .receipts/<id>
receipts open   --in .receipts/<id>
```

- `qa` boots the app (if `startCommand` is set), drives Playwright per claim,
  records a video + trace, captures before/after screenshots, and (with an API
  key) asks a vision model for a verdict per claim.
- **Exit code:** `qa` exits non-zero if any claim **fails or is inconclusive**, so
  CI can gate. Reasoning-only and visual-only runs exit `0`.

### Environment

| Var | Purpose |
|---|---|
| `RECEIPTS_API_KEY` | Anthropic API key for the vision judge. Omit → visual-only. |
| `RECEIPTS_MODEL` | Judge model id (default `claude-sonnet-4-6`). |

No telemetry. No network calls except the optional LLM judge.

## Landing page

A static marketing site lives in [`site/`](site/) — a single self-contained
`index.html` + `styles.css` (no build step). Open `site/index.html` in a browser,
or deploy it to GitHub Pages with the included
[`.github/workflows/pages.yml`](.github/workflows/pages.yml) (Settings → Pages →
Source: GitHub Actions).

## As a Claude skill

The [`pr-receipts/`](pr-receipts/) folder is an Anthropic Agent Skill. Installed
in Claude Code, it triggers on prompts like *"QA this and leave receipts on the
PR"* and runs the full flow: write `receipt-input.json` from session → `receipts
qa` → `receipts build` → surface the path. See
[`pr-receipts/SKILL.md`](pr-receipts/SKILL.md).

## GitHub Action

[`.github/workflows/receipts.yml`](.github/workflows/receipts.yml) is a template:
on a PR it installs Playwright, runs `qa` + `build`, uploads the receipt folder as
an artefact, and posts/updates a PR comment linking to it. Copy and adapt the boot
step for your stack.

## Graceful degradation

- **Backend/API-only PR** (no acceptance criteria or no `targetUrl`): emits a
  **reasoning-only** receipt, exits 0, and the report says no visual QA ran.
- **No API key:** **visual-only** receipt (video + screenshots, verdicts
  `not_tested`). Still valid and useful.

## Non-goals (v0)

- **Not an AI code reviewer.** No review comments, no severity ratings on the
  diff. We document and demonstrate; we don't critique the code.
- **Not observability/metrics.** No token/cost/latency dashboards.
- **Not a test-framework replacement.** We orchestrate Playwright; we don't
  reinvent assertions or visual-diff baselines.
- **Not hosted.** No accounts, no buckets, no DB in v0. (Hosted multiplayer
  review is Phase 2 — `manifest.json` stays the single source of truth so the
  same artefact powers both.)
- **UI/frontend work is the target.** API-only PRs degrade gracefully.

## Design decisions

- **Wrap Playwright directly** (don't depend on `yutori-ai/frontend-visualqa`),
  borrowing its claim/verdict discipline — keeps the dependency surface small and
  the artefact fully ours. Claims are natural language, judged by a vision LLM
  from screenshots (deterministic pixel asserts are out — too brittle).
- **Visual-only is a first-class mode**, so anyone without an API key still gets a
  useful receipt.
- **Receipts are gitignored by default** (CI artefact is the canonical delivery);
  `git add -f .receipts/<id>` to put one in the PR diff.

## Tech

TypeScript/Node, Playwright (`recordVideo` + `context.tracing`, pinned Chromium),
self-contained HTML (inline CSS/JS, no CDN, no `localStorage`). Run via `tsx` — no
build step. MIT licensed.

## License

[MIT](LICENSE).
