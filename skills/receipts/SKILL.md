---
name: receipts
description: >-
  Produce an Origin-style Demo Check on any PR — a recorded walkthrough video,
  expected-vs-actual screenshots, and the reasoning behind the change — so a
  human can watch the work. Use whenever you finish tested UI/frontend work
  (even if the user did not say "receipt"), and whenever the user asks to QA a
  change, document a PR, leave receipts, show how a change looks, or prove an
  agent's work before review.
environments: [cloud]
---

# Receipts — Demo Check for every PR

Origin already attaches a **Demo Check** to its PRs: a short native video of
the working change plus screenshots, in the PR itself. This skill does that
**for everyone else** — GitHub, Claude Code, CI, a laptop — and keeps Origin's
own PRs on the same Walkthrough.

A **receipt** is the durable folder behind that Walkthrough (`.receipts/<id>/`:
`index.html`, `manifest.json`, `media/`). The thing a reviewer actually sees is
the **Walkthrough block on the PR**: video, expected vs actual, how the agent
thought. Incumbents make AI review the PR; Receipts makes the agent prove its
work so a human can **watch the work**.

This skill **documents and demonstrates**. It does not critique the code or
emit review comments.

## When to use

Trigger when:

- You have **finished tested UI/frontend work** and are about to open or update
  a PR — even if nobody said "receipt". This is the Demo Check moment.
- The user asks to QA a change, document a PR, leave receipts, or show how a
  UI change looks.

Backend/API-only changes degrade to a reasoning-only Walkthrough (still useful).
Do not skip the Walkthrough because the host is not Origin.

## Workflow

Run these steps in order.

### 1. Write `receipt-input.json` from your session

You did the work — capture **what was asked, how you reasoned, and falsifiable
acceptance criteria**. Full schema: `references/schemas.md` (§8.1) (Claude
plugin) or `skills/receipts/references/schemas.md` in this repo.

Each `acceptanceCriteria[].claim` must be **observable, falsifiable, and
provable from pixels**. Prefer "A success toast with text 'Saved' is visible"
over "saving works".

For interactive claims, add a `steps` array (goto/click/fill/press/hover/select/wait)
so Playwright can reach the state. Keep `navigationHint` as the plain-language
description regardless. Minimal example:

```json
{
  "schemaVersion": "1",
  "task": "Add an empty-state to the dashboard when a user has no projects",
  "branch": "feat/dashboard-empty-state",
  "prNumber": null,
  "targetUrl": "http://localhost:3000",
  "startCommand": "npm run dev",
  "acceptanceCriteria": [
    {
      "id": "ac1",
      "claim": "When there are no projects, an empty-state with the text 'No projects yet' and a 'Create project' button is visible",
      "navigationHint": "open the dashboard as a fresh user with no projects",
      "viewport": "desktop",
      "path": "/dashboard"
    }
  ],
  "plan": "Render <EmptyState> when projects.length === 0; reuse existing Button.",
  "decisions": ["Reused the shared <EmptyState> rather than a bespoke block, for consistency"],
  "rejectedAlternatives": ["A full onboarding wizard — too heavy for v0"],
  "promptLog": [],
  "filesChanged": [
    { "path": "app/dashboard/page.tsx", "additions": 24, "deletions": 3, "area": "dashboard" }
  ]
}
```

Populate `plan`, `decisions`, `rejectedAlternatives`, and (if available)
`promptLog` / `filesChanged` from the session. For `filesChanged`,
`git diff --numstat <base>...HEAD`.

**Set `prNumber` as soon as you have a PR number.** `receiptId()` names the
folder `pr-<n>` when set. Short ids survive GitHub's markdown link parser.

### 2. Record the walkthrough

**Playwright (`receipts qa`) is the Demo Check engine on GitHub, Claude Code,
CI, and laptops.** It boots the app, drives each claim, records video +
before/after screenshots, and — with `RECEIPTS_API_KEY` — judges pass/fail from
the frame sequence.

```bash
receipts qa --input receipt-input.json
# the runner boots the app itself if startCommand is set; otherwise pass --url
```

Without an API key it runs **visual-only** (verdicts = `not_tested`); pass
`--no-judge` to make that explicit. `qa` exits 1 if any claim fails or is
inconclusive (expected content — still build + embed); exit 2 is infra (app
never booted / browser failed) — do not publish stale media.

If acceptance criteria were written *before* the work, pass
`receipts qa --contract claims.json` so they are tagged independently. Every
`pass` is re-checked by an adversarial judge (`--no-adversarial` disables).

**Cursor Cloud extra (Origin-quality native video):** when a desktop/browser
is available, *also* record a short successful GUI walkthrough the way Origin
Demo Check does:

1. Set up the UI (open the app, navigate to the feature). Do **not** record setup.
2. `RecordScreen` `START_RECORDING`.
3. Drive the happy path with `computerUse` (the same claims as in `receipt-input.json`).
4. `SAVE_RECORDING` on success; `DISCARD_RECORDING` on failure, fix, retry.
   Never upload a failing take. Start at the test, not at `npm install`.

Copy that recording into the artifacts directory (`/opt/cursor/artifacts/`)
with a short snake_case name (`walkthrough.mp4`). `receipts qa` still runs —
it is the structured expected-vs-actual + optional judge. The desktop recording
is the Origin-quality "watch the work" video when you have a desktop; Playwright
is what everyone else gets.

### 3. Build the receipt

```bash
receipts build --in .receipts/<id>
```

Merges into `manifest.json` and renders self-contained `index.html`. If ffmpeg
is present, `qa` already wrote `media/session.mp4` (H.264) next to the WebM so
Origin/Safari can play it.

### 4. Embed the Walkthrough on the PR — this is the Demo Check

Do **not** hand-write GIF markdown. Generate the same Walkthrough Origin shows:

```bash
# Cursor Cloud / Origin — native <video> + <img> in the PR body
receipts embed --in .receipts/<id> --format origin --artifacts-dir /opt/cursor/artifacts --out walkthrough.md

# GitHub / GitLab / everywhere else — GIF in the comment (light, autoplays)
receipts embed --in .receipts/<id> --format github --out walkthrough.md
```

`embed` picks `origin` automatically when `/opt/cursor/artifacts` exists.

**Origin / Cursor Cloud:** put the Walkthrough (`<!-- receipts-walkthrough -->`
… `<!-- /receipts-walkthrough -->`) **in the PR body**, using the HTML
`<video src="…">` and `<img>` tags `embed` emitted (absolute artifact paths).
Update that section on later turns; do not bury it in a side comment if the PR
body can hold it.

**GitHub / GitLab / other hosts:** `embed --format github` inlines a downscaled
GIF (GFM autoplays it; stays light) plus expected-vs-actual stills. Full-quality
WebM/MP4 stay as click-through links. Pass `--upload` if you want a native
GitHub `<video>` player (`gh auth` / PAT — Actions `GITHUB_TOKEN` often cannot).

**Set `prNumber` on the input** once the PR exists, then rebuild if you need
the folder named `pr-<n>`.

### 5. Optional publish + open

```bash
receipts publish --in .receipts/<id>   # only if the user asked for a hosted link
receipts open --in .receipts/<id>
```

Skip publish when no Supabase/`RECEIPTS_TOKEN` is configured. Report the
overall verdict, the receipt path, and the Walkthrough location (PR body or
comment).

## Graceful degradation

- **No acceptance criteria / no `targetUrl`:** reasoning-only Walkthrough,
  exit 0. Never hard-fail because there was nothing visual.
- **No API key:** visual-only (video + screenshots, verdicts `not_tested`).
- **No ffmpeg:** skip `session.mp4`; Origin embed falls back to WebM; GitHub
  CI still transcodes a GIF when ffmpeg is installed there.
- **GitHub comments stay on the GIF** unless you pass `--upload`. A native GFM
  player needs a user/PAT token (`gh auth`, `GH_TOKEN`, `RECEIPTS_GITHUB_TOKEN`).
- **No Cursor desktop:** Playwright alone is the Demo Check. That is the point
  of this skill — Origin's experience, for the others.

## Notes

- Receipt folders are gitignored. Force-add with `git add -f .receipts/<id>`
  only when reviewers need the folder in the diff.
- If you force-add a receipt AND CI also runs `receipts qa` on the same PR,
  CI must start from a clean `.receipts/` (`rm -rf .receipts` — already in
  `receipts.yml`). Exit 2 (infra) is a hard job failure; exit 1 (claims
  failed/inconclusive) still builds + embeds.
- **Root `receipt-input.json`:** this repo's CI only fires if that file exists
  at repo root. Remove or overwrite it once its PR merges, or every later PR
  regenerates the stale receipt.
- `receipts verify --in .receipts/<id>` proves the receipt was not edited
  after `build`. `receipts doctor` preflights Node, Chromium, and API-key mode.
- Full data contracts: `references/schemas.md`.
