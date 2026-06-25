# Receipts — data contracts

These three JSON files are the spine of the product. The HTML report reads only
`manifest.json`; the other two are inputs to the build.

A receipt folder `.receipts/<id>/` contains:

```
index.html            self-contained report (opens from file://)
manifest.json         merged index the HTML renders from
receipt-input.json    intent + reasoning (written by the agent)
qa-results.json       visual-QA output (emitted by `receipts qa`)
media/
  session.webm        recorded Playwright session
  trace.zip           Playwright trace
  <acId>-before.png   per-claim before screenshot (only when the claim has steps)
  <acId>-after.png    per-claim after screenshot
```

`<id>` is `pr-<number>` when a PR number is known, else a sanitized branch name.

---

## 8.1 `receipt-input.json` — written by the agent

The intent/reasoning side. The agent populates this from its own session.

```jsonc
{
  "schemaVersion": "1",
  "task": "string — what was asked, plain language",
  "branch": "string",
  "prNumber": "number | null",
  "targetUrl": "string — base URL the app serves on for QA, e.g. http://localhost:3000",
  "startCommand": "string | null — optional command to boot the app before QA",
  "acceptanceCriteria": [
    {
      "id": "ac1",
      "claim": "string — observable, falsifiable, provable from pixels",
      "navigationHint": "string | null — how to reach the state, plain language",
      "viewport": "desktop | mobile | tablet | null",

      // Optional v0 extensions (not in the original PRD schema, added so QA can
      // actually reach interactive states deterministically without an LLM
      // driving the browser):
      "path": "string | null — path/url to load for this claim instead of targetUrl root",
      "steps": [
        // Deterministic navigation run before the "after" screenshot.
        // When a claim has `steps`, a "before" screenshot is also captured.
        { "action": "goto",   "value": "/dashboard" },
        { "action": "click",  "selector": "button#add" },
        { "action": "fill",   "selector": "input[name=q]", "value": "hello" },
        { "action": "press",  "selector": "input[name=q]", "value": "Enter" },
        { "action": "hover",  "selector": ".menu" },
        { "action": "select", "selector": "select#country", "value": "DE" },
        { "action": "wait",   "value": 500 }
      ]
    }
  ],
  "plan": "string — the approved plan",
  "decisions": ["string — key decisions made and why"],
  "rejectedAlternatives": ["string — approaches considered and dropped, and why"],
  "promptLog": [
    { "role": "user | assistant", "text": "string", "ts": "ISO8601 | null" }
  ],
  "filesChanged": [
    { "path": "string", "additions": "number", "deletions": "number", "area": "string | null" }
  ]
}
```

**Claim discipline:** prefer "is X visible / equals Y" over "is correct". Claims
must be falsifiable from pixels alone — that is what makes the LLM verdict (and a
human's 90-second skim) trustworthy.

`steps`/`path` are optional. Omit them and the runner just loads `targetUrl` and
screenshots it. They exist so interactive acceptance criteria can be reached
deterministically in v0; a future version may drive the browser from
`navigationHint` directly.

---

## 8.2 `qa-results.json` — emitted by `receipts qa`

```jsonc
{
  "schemaVersion": "1",
  "startedAt": "ISO8601",
  "durationMs": "number",
  "videoPath": "media/session.webm | null",
  "tracePath": "media/trace.zip | null",
  "reasoningOnly": "boolean — true when no visual QA ran",
  "results": [
    {
      "acId": "ac1",
      "claim": "string",
      "verdict": "pass | fail | inconclusive | not_tested",
      "judge": "llm | none",
      "rationale": "string | null — model's reasoning for the verdict",
      "screenshots": {
        "before": "media/ac1-before.png | null",
        "after": "media/ac1-after.png"
      }
    }
  ],
  "summary": { "pass": 0, "fail": 0, "inconclusive": 0, "not_tested": 0 }
}
```

**Exit code of `receipts qa`:** `0` only when no claim is `fail` or
`inconclusive`. `pass`/`not_tested`/reasoning-only all exit `0`; any
`fail`/`inconclusive` exits non-zero so CI can gate.

---

## 8.3 `manifest.json` — merged index the HTML renders from

Superset combining `receipt-input.json` + `qa-results.json` + metadata.

```jsonc
{
  "schemaVersion": "1",
  "generatorVersion": "receipts@x.y.z",
  "generatedAt": "ISO8601",
  "overallVerdict": "pass | fail | reasoning-only | visual-only",
  "repo": "string | null — https URL of origin remote",
  "commit": "string | null — HEAD sha",
  "input":  { /* full receipt-input.json */ },
  "qa":     { /* full qa-results.json */ }
}
```

`overallVerdict`:
- `pass` — every claim passed.
- `fail` — any claim failed or was inconclusive.
- `visual-only` — QA ran but all verdicts were `not_tested` (no judge / `--no-judge`).
- `reasoning-only` — no visual QA ran (no acceptance criteria or no `targetUrl`).

`manifest.json` is the single source of truth for both the local report and the
hosted layer — keep the report generator decoupled from storage.

---

## 8.4 `publish.json` — written by `receipts publish`

Optional. Only present after a receipt is pushed to Supabase. The CI workflow
reads `reportUrl` / `videoUrl` from here to build the PR comment.

```jsonc
{
  "schemaVersion": "1",
  "mode": "byo | hosted",
  "id": "string — receipts.id (BYO) or the id minted by the ingest function",
  "reportUrl": "string — public URL to index.html",
  "videoUrl": "string | null — public URL to the recorded session",
  "publishedAt": "ISO8601"
}
```

### Hosted persistence (Supabase)

`supabase/migrations/0001_receipts.sql` defines the schema both modes write to:

- **`receipts` table** — one row per published receipt: metadata (`repo`,
  `branch`, `pr_number`, `task`, `overall_verdict`, `summary`), the full
  `manifest` (jsonb), storage pointers (`storage_prefix`, `report_path`,
  `video_path`), public URLs (`report_url`, `video_url`), and `visibility`
  (`unlisted` | `public` | `private`).
- **`api_keys` table** — hosted-mode upload tokens, stored only as
  `sha256(token)` in `token_hash`, scoped by `owner_id`.
- **`receipts` storage bucket** — files under `<owner>/<id>/…`
  (`index.html`, `manifest.json`, `media/`). Public-read by default but
  unguessable (uuid prefix); flip to private + signed URLs for hard access
  control.

**Mode selection** (`receipts publish`): BYO (`RECEIPTS_SUPABASE_URL` +
`RECEIPTS_SUPABASE_KEY`, service role, RLS bypassed) takes precedence; otherwise
hosted (`RECEIPTS_TOKEN` → the `ingest` edge function, which holds the service
key). See `docs/hosting.md` for the full setup and the signed-upload protocol.
