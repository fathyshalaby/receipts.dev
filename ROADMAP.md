# Receipts — roadmap / what would make a skeptic install this

This is the honest gap list between *"clean demo generator"* (today) and
*"a verification artifact a senior dev trusts in CI"* (the goal). It came out of a
deliberately adversarial review. Tiers are ordered by how much trust each item
buys, not by effort.

Status legend: ✅ done · 🚧 prototype in tree · ⬜ not started.

## Tier 0 — credibility (without these, the verdict isn't believable)

- 🚧 **Judge the work, not two stills.** The judge now receives the chronological
  sequence of frames captured across the interaction (before → per-step →
  after), not just before/after. Still a prototype: frames come from per-step
  screenshots, not sampled video frames. _(`qa.ts`, `judge.ts`)_
- 🚧 **Break the self-grading loop with an adversarial pass.** Every claim the
  primary judge marks `pass` is re-checked by a second, skeptical judge prompted
  to *refute* it. A successful refutation downgrades `pass → inconclusive`
  (CI-red) rather than letting a self-authored claim wave itself through.
  _(`judge.ts: refuteClaim`/`reconcileVerdict`, unit-tested)_
- ⬜ **Author claims before the work, from the issue/ticket.** Today the same
  agent that did the work writes the acceptance criteria from its own session —
  post-hoc rationalization. The claims should be an input contract, not an
  output.
- 🚧 **Full-page screenshots** (was viewport-only — below-the-fold changes were
  invisible to the judge). _(`qa.ts`)_
- ⬜ **State-based waits + retry.** Replace the fixed `waitForTimeout(300)` races
  with `waitForSelector`/network-idle, and retry a flaky claim once before
  calling it `inconclusive` (so CI isn't red for non-code reasons).
- ⬜ **A golden end-to-end test.** Fixture app → `qa` → `build`, asserting the
  manifest, the verdict logic, and a snapshot of the report. The pipeline that
  produces the proof currently has no test of its own.

## Tier 1 — make "receipt" mean something

- ⬜ **Tamper-evidence.** Sign/hash the manifest and bind media to the commit SHA
  + CI run id, so a receipt can't be hand-edited (`fail`→`pass`) in a text
  editor.
- ⬜ **No wrong-screen passes.** When LLM nav runs fewer steps than it planned
  (best-effort skipping), force `inconclusive` and surface it loudly instead of
  judging whatever screen we happened to land on.
- ⬜ **Cost ceiling + cache.** Don't re-judge unchanged claims; cap spend per run.
  (The adversarial pass already only fires on `pass` verdicts to bound cost.)

## Tier 2 — stop losing users in the first five minutes

- ✅ **System-browser fallback.** `qa` now falls back to a system Chrome/Chromium/
  Edge channel (and honors `RECEIPTS_CHROMIUM_PATH`) when the pinned Playwright
  build can't be fetched — previously the quickstart hard-failed in any
  locked-down sandbox/CI. _(`qa.ts`)_
- ✅ **De-dupe the recording.** The raw Playwright `.webm` is removed after it's
  copied to `session.webm`; receipts no longer ship (and publish) the video
  twice. _(`qa.ts`)_
- ✅ **Naming clarity.** README now states up front that `nuro`,
  `receipts.dev`, and `@fathyshalaby/receipts` are the same project, and the
  `git clone` URL points at the real repo.
- ✅ **"One self-contained *folder*."** Fixed the README copy that called the
  receipt "one self-contained file" — it's a folder (`index.html` + `media/`).
- ⬜ **One live hosted example receipt** linked from the README, so the gallery
  shows a real artifact you can click without building one first.
- ⬜ **Receipt weight.** Document the size / `git add -f` history-bloat tradeoff;
  consider JPEG screenshots and trace-on-failure-only.

## Tier 3 — the positioning that makes it a *good idea*

- ⬜ **Reframe around the honest wedge.** It's an *acceptance-evidence* generator,
  not a review replacement: "every agent PR ships a watchable acceptance demo +
  the claims it had to satisfy, gated in CI — and the claims are the contract,
  set from the issue before the agent starts." That flips it from the agent's
  self-flattering highlight reel to "did it satisfy the contract we set."
