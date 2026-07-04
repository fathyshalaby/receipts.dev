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

**Set `prNumber` whenever you know it.** `receiptId()` names the output folder
`pr-<n>` when `prNumber` is set, or a sanitized slug of `branch` otherwise. If
your branch name is long and also happens to appear again inside the folder
path (it will, since `.receipts/<id>/` sits under the repo), the *duplicated*
long slug can break GitHub's markdown link parser when you later reference
`media/*.png` by raw URL in a PR description — it silently renders an empty
`href`/`src` instead of erroring. `pr-<n>` is short, never repeats, and is the
tool's own preferred id — set it as soon as you have a PR number, even if you
write `receipt-input.json` before opening the PR (edit it in after).

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

**Stronger receipts — independent claims:** if acceptance criteria were written
*before* the work (e.g. from the issue), put them in their own file and pass
`receipts qa --contract claims.json`. They're tagged as independently authored;
a run where every claim was agent-written is flagged **self-graded** in the
report. Every `pass` is also re-checked by an adversarial judge that tries to
refute it (downgrades to `inconclusive`); disable with `--no-adversarial`.

### 3. Build the report

```bash
receipts build --in .receipts/<id>
```

Merges everything into `manifest.json` and renders a single self-contained
`index.html` (inline CSS/JS, media by relative path, no network).

### 4. (Optional) Publish to Supabase

By default a receipt is a local, self-contained folder — no hosting needed. To
get a **shareable link for the PR** (the hosted report + a direct video link),
publish it to Supabase. Two modes, picked from the environment:

```bash
receipts publish --in .receipts/<id>
```

- **Bring-your-own** — set `RECEIPTS_SUPABASE_URL` + `RECEIPTS_SUPABASE_KEY`
  (service role) to publish to the user's own project.
- **Hosted ("ours")** — set `RECEIPTS_TOKEN` (an upload token) and the CLI POSTs
  to the hosted ingest endpoint; the service key never leaves the server.

It uploads the report + media, records a row, and writes `publish.json` with the
`reportUrl` and `videoUrl`. Only publish when the user asked for a hosted/shared
link or asked to "send it" — local receipts are the zero-config default. If no
Supabase target is configured, skip this step (don't error).

### 5. Surface it

Tell the user the path, and offer to open it:

```bash
receipts open --in .receipts/<id>
```

Then report the overall verdict and the receipt location (and the `reportUrl` /
`videoUrl` if it was published). In CI, the GitHub Action
(`.github/workflows/receipts.yml`) publishes to Supabase when configured,
uploads the folder as an artefact, and comments the links on the PR.

**No publish target and you still want it visible *in* the PR description**
(not just linked)? Force-add the receipt folder (see Notes below) and embed
media by raw URL — but be deliberate about what actually renders inline:

- Screenshots: plain Markdown `![claim](raw-url)` — this just works.
- The video: GitHub only gives you a real `<video>` player for pasted/dragged
  attachments (hosted under `user-images.githubusercontent.com`). A `media/*.webm`
  or `.mp4` referenced by its raw repo URL never auto-embeds — GFM renders it as
  a plain link, full stop, regardless of container format. If you want the
  recording actually *playing* in the description, transcode a short animated
  GIF and embed that instead (GFM autoplays animated images):
  `ffmpeg -i session.webm -vf "fps=8,scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen=stats_mode=diff[p];[s1][p]paletteuse=dither=bayer" session.gif`
  — then link the original `session.webm` (and optionally an H.264 `.mp4`
  transcode, more broadly compatible for click-through, e.g. in Safari)
  alongside for full quality/framerate. Re-run `receipts build` after adding
  extra media files so the manifest's integrity hash covers them.
- The interactive `index.html` itself can't be linked-to-render: GitHub serves
  raw `.html` as `text/plain` (deliberately, so it can't execute as a page).
  There's no link that opens it live short of an actual publish target
  (Supabase) or hosting it yourself (e.g. GitHub Pages) — reproduce its
  sections manually in the PR body (video/GIF, before/after per claim,
  reasoning) if you don't have one configured, same as this repo's own demo
  PRs do.

This repo's own `.github/workflows/receipts.yml` automates exactly this: when
no Supabase target is configured, its `Generate inline preview` step does the
GIF transcode, force-commits the receipt back onto the PR branch (message
tagged `[skip ci]` so it doesn't retrigger the workflow), and the `Comment on
PR` step reads `manifest.json` to embed the GIF + every claim's before/after
inline automatically. Needs `permissions: contents: write`; only works for
same-repo PRs (`GITHUB_TOKEN` can't push to a fork's branch) — falls back to
the plain artefact-download comment if the push fails.

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
- **If you force-add a receipt AND this repo's CI also runs `receipts qa`
  on the same PR, make sure CI starts from a clean `.receipts/`** (`rm -rf
  .receipts` before the `qa` call — already done in
  `.github/workflows/receipts.yml`). Without it: if the app-under-test fails
  to boot in CI (`qa` exits 2 and — by design — leaves `qa-results.json`/
  `media/` untouched rather than fabricating them), `receipts build` will
  silently repackage your locally-committed, stale data as if it were this
  commit's result. The workflow now also treats exit code 2 (infra failure —
  app never booted, or the browser failed to launch) as a hard job failure
  distinct from exit code 1 (claims genuinely failed/inconclusive, which
  should still build + publish) — a green check must mean QA actually ran.
- A built receipt is **tamper-evident**: `build` writes content hashes (and an
  HMAC signature if `RECEIPTS_SIGNING_KEY` is set). Run `receipts verify --in
  .receipts/<id>` to prove it wasn't edited after the fact (CI-gateable).
- Unsure the machine can produce a receipt? `receipts doctor` checks Node,
  whether Chromium launches, and the API-key mode in one command.
- This skill **documents and demonstrates**; it does not critique the code or
  emit review comments. That is deliberate (see README "Non-goals").
- Full data contracts: `references/schemas.md`.
