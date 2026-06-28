# Receipts — roadmap / what would make a skeptic install this

This is the gap list between *"clean demo generator"* and *"a verification artifact
a senior dev trusts in CI"*. It came out of a deliberately adversarial review.
Most of it is now shipped; the rest is tracked at the bottom.

Status: ✅ done · 🟡 partial · ⬜ open.

## Tier 0 — credibility (the verdict has to be believable)

- ✅ **Judge the work, not two stills.** The judge receives the chronological
  frame sequence per claim (before → per-step → after), captured via `onStep`
  hooks in `runSteps`/`llmNavigate`. _(`qa.ts`, `judge.ts`)_
- ✅ **Break the self-grading loop — adversarial pass.** Every `pass` is
  re-checked by a second judge prompted to *refute* it; a refutation downgrades
  `pass → inconclusive`. Bound to passing claims to cap cost.
  _(`judge.ts: refuteClaim`/`reconcileVerdict`, unit-tested)_
- ✅ **Claims as an independent contract.** `receipts qa --contract claims.json`
  takes acceptance criteria authored independently of the work. Every claim
  carries provenance (`agent` vs `contract`/`issue`/`human`), shown in the
  report; a run where all claims are agent-authored is flagged **self-graded**.
  _(`qa.ts: mergeCriteria`, unit-tested; `report.ts`)_
- ✅ **Full-page screenshots** (was viewport-only). _(`qa.ts`)_
- ✅ **State-based waits + retry.** The fixed `waitForTimeout(300)` races are
  gone — bounded `networkidle` settles — and a flaky claim is retried once
  before it's called `inconclusive`. _(`qa.ts`)_
- ✅ **Golden end-to-end test + CI.** `__tests__/e2e.test.ts` boots the demo,
  runs the real `qa → build → verify` in a browser, and asserts the manifest,
  verdict, frames, integrity, and tamper-detection. `.github/workflows/ci.yml`
  runs typecheck + the full suite (with Chromium) on every PR.

## Tier 1 — make "receipt" mean something

- ✅ **Tamper-evidence.** `build` writes an integrity block (sha256 of the
  manifest data + every evidence file), optionally HMAC-signed with
  `RECEIPTS_SIGNING_KEY`. `receipts verify` recomputes and **exits non-zero on
  any edit** — content hashes catch naive tampering, the signature catches
  forgery. _(`integrity.ts`, `verify.ts`, unit + e2e tested)_
- ✅ **No wrong-screen passes.** When LLM nav runs fewer steps than it planned,
  a `pass` is downgraded to `inconclusive` with a note. _(`qa.ts`)_
- ✅ **Cost ceiling.** `--max-judge-calls N` / `RECEIPTS_MAX_JUDGE_CALLS` caps
  vision-model calls per run; remaining claims degrade to `not_tested` with a
  note. _(`qa.ts`)_
- ⬜ **Cache unchanged claims** across runs (needs a persisted per-claim frame
  hash → verdict store).

## Tier 2 — don't lose users in the first five minutes

- ✅ **`receipts doctor`** — laptop preflight: Node version, *does Chromium
  actually launch*, API-key mode. One command, exact fixes. _(`doctor.ts`)_
- ✅ **System-browser fallback** + `RECEIPTS_CHROMIUM_PATH`.
- ✅ **De-dupe the recording** (no more double video).
- ✅ **Trace-on-failure-only** — a clean run prunes `trace.zip`. _(`qa.ts`)_
- ✅ **Naming clarity** + fixed clone URL + "one self-contained *folder*".
- ⬜ **One live hosted example receipt** linked from the README (needs a
  deployed Supabase/gallery instance).
- 🟡 **Receipt weight** — trace-on-failure done; JPEG screenshots still open
  (kept PNG for now so the judge reads text crisply).

## Tier 3 — the positioning that makes it a *good idea*

- 🟡 **Honest wedge.** Docs now lead with acceptance-evidence + CI gating +
  claims-as-contract + tamper-evidence, instead of "watch the work instead of
  reviewing". The deeper landing-page rewrite is still open.
