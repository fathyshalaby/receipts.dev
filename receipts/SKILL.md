---
name: receipts
description: Generate a visual-QA walkthrough and reasoning record ("receipt") for a coding agent's work, attached to the PR. Use whenever the user asks to QA a change, document a PR, "leave receipts", show how a change looks, prove an agent's work before review, or produce expected-vs-actual visual proof of a UI change — even if they don't say the word "receipt".
---

# Receipts — make the agent prove its work

A **receipt** is one self-contained artefact a human can judge in ~90 seconds:
a recorded Playwright visual-QA walkthrough + the reasoning behind the change +
an expected-vs-actual view. Incumbents make AI review the PR; Receipts makes the
agent prove its work so a human can **watch the work**.

The output is a folder `.receipts/<id>/` containing `index.html` (opens from
`file://`, no server), `manifest.json`, `receipt-input.json`, `qa-results.json`,
and `media/` (video, screenshots, trace.zip).

## When to use this skill

Trigger when the user wants to QA a change, document/prove a PR, show how a UI
change looks, or "leave receipts" — for UI/frontend work where a visual
walkthrough is the point. Backend/API-only changes degrade gracefully to a
reasoning-only receipt (still useful).

## Workflow

Run these steps in order. Steps 1 is yours (write the intent from your session);
steps 2–4 are the CLI.

### 1. Write `receipt-input.json` from your session context

You have the richest context for this — you did the work. Write a
`receipt-input.json` capturing **what was asked, how you reasoned, and the
falsifiable acceptance criteria**. Full schema: `references/schemas.md` (§8.1).

Key discipline for `acceptanceCriteria[].claim`: each claim must be **observable,
falsifiable, and provable from pixels**. Prefer "The checkout total equals the
sum of line items" or "A success toast with text 'Saved' is visible" over vague
claims like "checkout works" or "the UI is correct".

For interactive claims, add a `steps` array (deterministic Playwright actions —
click/fill/press/goto) so QA can reach the state. Keep `navigationHint` as the
plain-language description regardless. Minimal example:

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

Populate `decisions`, `rejectedAlternatives`, `plan`, and (if available)
`promptLog` and `filesChanged` from your actual session — this is the "how the
agent thought" half of the receipt. For `filesChanged`, you can derive
additions/deletions from `git diff --numstat <base>...HEAD`.

### 2. Run the visual QA

```bash
receipts qa --input receipt-input.json
# the runner boots the app itself if startCommand is set; otherwise pass --url
```

This boots the app (if `startCommand` is set), drives Playwright per claim,
records a video + trace, captures before/after screenshots, and — when
`RECEIPTS_API_KEY` is set — asks a vision model for a pass/fail/inconclusive
verdict per claim. Without an API key it runs **visual-only** (verdicts =
`not_tested`); pass `--no-judge` to make that explicit and silence the warning.

`receipts qa` exits non-zero if any claim **fails or is inconclusive** (so CI can
gate). Reasoning-only and visual-only runs exit 0.

### 3. Build the report

```bash
receipts build --in .receipts/<id>
```

Merges everything into `manifest.json` and renders a single self-contained
`index.html` (inline CSS/JS, media by relative path, no network).

### 4. Surface it

Tell the user the path, and offer to open it:

```bash
receipts open --in .receipts/<id>
```

Then report the overall verdict and the receipt location. In CI, the GitHub
Action (`.github/workflows/receipts.yml`) uploads the folder as an artefact and
comments on the PR.

## Graceful degradation

- **No acceptance criteria / no `targetUrl`** (e.g. a backend-only PR): QA is
  skipped, a reasoning-only receipt is emitted, exit 0, and the report header
  states no visual QA ran. Never hard-fail because there was nothing visual.
- **No API key**: visual-only receipt (video + screenshots, verdicts
  `not_tested`). Still a valid, useful receipt.

## Notes

- Receipt folders are gitignored by default (CI artefact is the canonical
  delivery). To let reviewers see the receipt in the PR diff, force-add it:
  `git add -f .receipts/<id>`.
- This skill **documents and demonstrates**; it does not critique the code or
  emit review comments. That is deliberate (see README "Non-goals").
- Full data contracts: `references/schemas.md`.
