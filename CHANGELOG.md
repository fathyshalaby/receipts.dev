# Changelog

All notable changes to **Receipts** (`@fathyshalaby/receipts`) are recorded here.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/); this
project uses [SemVer](https://semver.org/).

## [Unreleased]

## [0.1.0] — first release

The initial public release: make a coding agent prove its work — a recorded
visual-QA walkthrough + the reasoning behind a PR, packaged as one artefact a
human can judge in ~90 seconds.

### Core
- `receipts qa` — boots the app, drives Playwright per acceptance claim, records
  a video + trace + before/after screenshots, and (with `RECEIPTS_API_KEY`) asks
  a vision model for a pass/fail/inconclusive verdict per claim. CI-gateable exit
  codes; graceful degradation to visual-only and reasoning-only modes.
- `receipts build` — merges everything into `manifest.json` and renders one
  self-contained `index.html` (inline CSS/JS, no network).
- `receipts open` — opens the report.
- **LLM-driven navigation** — a claim with only a plain-language `navigationHint`
  (no deterministic `steps`) is reached by planning Playwright steps from the
  hint, run best-effort.

### Distribution
- Ships as a **Claude Code plugin** (`.claude-plugin/`) bundling the `receipts`
  skill (`skills/receipts/`). Install: `/plugin marketplace add fathyshalaby/nuro`
  → `/plugin install receipts`.
- Published to npm as **`@fathyshalaby/receipts`** (the `receipts` package name
  was taken). `npx @fathyshalaby/receipts …`.

### Hosting (optional)
- `receipts publish` — push a receipt to Supabase and get a shareable link.
  Two modes: **BYO** (`RECEIPTS_SUPABASE_URL` + `RECEIPTS_SUPABASE_KEY`) and
  **hosted** (`RECEIPTS_TOKEN` → an `ingest` edge function).
- `receipts login` / `logout` / `whoami` — save publish creds locally
  (`~/.receipts/config.json`, `0600`); env always overrides.
- `receipts tokens issue|revoke|list` — operator tooling to mint hosted upload
  tokens (stored only as `sha256`).
- Supabase migration (receipts + api_keys tables, RLS, storage bucket) and the
  `ingest` edge function under `supabase/`.
- **Gallery** (`web/`) — a Next.js dashboard to browse, filter, and review
  published receipts (Supabase magic-link auth, owner-scoped via RLS).

### GitHub Action
- `.github/workflows/receipts.yml` — on a PR, runs QA + build, publishes to
  Supabase when configured, and comments the hosted report + raw-video links
  (falling back to the artefact otherwise).

[Unreleased]: https://github.com/fathyshalaby/nuro/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/fathyshalaby/nuro/releases/tag/v0.1.0
