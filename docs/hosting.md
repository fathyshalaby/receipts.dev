# Hosting receipts on Supabase

By default a receipt is a **local, self-contained folder** — open `index.html`
from `file://`, no server, no account. That's still the canonical artefact.

`receipts publish` is the optional Phase-2 step that puts a receipt behind a URL
so a PR comment can link to **the hosted report** and **the raw video**. The
`manifest.json` stays the single source of truth either way.

There are two modes, chosen from the environment. BYO wins if its vars are set.

```
┌── receipts publish ──┐
│  RECEIPTS_SUPABASE_* │ ──▶  BYO: talk straight to your Supabase (service role)
│        set?          │
│         else         │
│  RECEIPTS_TOKEN set? │ ──▶  Hosted: POST the ingest edge function with a token
└──────────────────────┘
```

---

## Mode 1 — Bring your own Supabase (BYO)

You own the project; the CLI writes to it directly with a **service-role key**
(which bypasses RLS — keep it server-side, e.g. a GitHub Actions secret).

1. Create a Supabase project.
2. Run the migration in `supabase/migrations/0001_receipts.sql` (SQL editor, or
   `supabase db push`). It creates the `receipts` + `api_keys` tables, RLS, and
   the public-read `receipts` storage bucket.
3. Set the env and publish:

   ```bash
   export RECEIPTS_SUPABASE_URL="https://<ref>.supabase.co"
   export RECEIPTS_SUPABASE_KEY="<service-role-key>"
   receipts publish --in .receipts/<id>
   ```

`publish.json` is written into the receipt folder with the `reportUrl` and
`videoUrl`. Re-publishing the same PR reuses a stable storage prefix
(`pr-<n>`), so the links don't change between runs.

## Mode 2 — Hosted ("ours")

End users never hold a service key. They get an **upload token**; the CLI POSTs
the `ingest` edge function, which validates the token and does the privileged
writes itself.

**Operator setup** (whoever runs the shared instance):

1. Provision a Supabase project and apply the same migration.
2. Deploy the edge function:

   ```bash
   supabase functions deploy ingest --no-verify-jwt
   ```

   `--no-verify-jwt` is required — the function does its own bearer-token auth
   against `api_keys`, so Supabase's JWT gate must be off.
3. Issue a token to a user with the operator CLI (it generates the token,
   stores only `sha256(token)`, and prints the raw value once). This needs your
   service-role creds:

   ```bash
   export RECEIPTS_SUPABASE_URL="https://<ref>.supabase.co"
   export RECEIPTS_SUPABASE_KEY="<service-role-key>"
   receipts tokens issue --label "fathy laptop" --owner <user-uuid>
   #   → prints the token once; receipts tokens list / revoke <id|token> to manage
   ```

   (Equivalent raw SQL, if you prefer:
   `insert into api_keys (token_hash, owner_id, label) values (encode(digest('<raw-token>','sha256'),'hex'), '<user-uuid>', 'fathy laptop');`)
4. Bake the function URL into the CLI default (`DEFAULT_INGEST_URL` in
   `receipts/scripts/publish.ts`) or have users set `RECEIPTS_INGEST_URL`.

**End-user usage** — save the token once with `receipts login`, then publish:

```bash
receipts login --token "<raw-token>"               # stored 0600 in ~/.receipts/config.json
# receipts login --token "<raw-token>" --ingest-url "https://<ref>.functions.supabase.co/ingest"
receipts publish --in .receipts/<id>
# receipts whoami   → show what's configured     receipts logout → forget it
```

Env vars (`RECEIPTS_TOKEN`, `RECEIPTS_INGEST_URL`) still work and always
override the saved config, so CI stays env-driven.

### Protocol

The ingest function uses a signed-upload-URL handshake so large video bytes
never pass through the function:

1. CLI → `POST /ingest` `{ manifest, files: [{ path, contentType }] }` with
   `Authorization: Bearer <token>`.
2. Function validates the token, inserts the `receipts` row, mints a signed
   upload URL per file, returns `{ id, reportUrl, videoUrl, uploads }`.
3. CLI `PUT`s each file straight to its signed URL.

---

## Access control

The `receipts` bucket is **public-read** by default, but every receipt lives
under an unguessable `uuid` prefix, so a public bucket is effectively
**link-only**. For hard access control, switch the bucket to private and serve
**signed URLs** instead — change `public` to `false` in the migration and have
the ingest function / BYO publish return `createSignedUrl(...)` links with an
expiry. The DB rows already carry `visibility` (`unlisted` | `public` |
`private`) to drive the gallery's access rules.

---

## Gallery (web app)

[`web/`](../web/) is a Next.js app — the hosted "multiplayer review" surface.
It reads the `receipts` table (it never writes) and lets a signed-in user browse
their receipts, filter by repo/verdict, and open a detail view that embeds the
report and links the video. Owner-scoped rows come from **hosted-mode** publishes
(where the ingest function sets `owner_id`); BYO publishes leave `owner_id` null.

```bash
cd web
cp .env.example .env.local   # NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install && npm run dev
```

Auth is Supabase email magic-link; access is enforced by the same RLS policies
in the migration (`receipts_owner_read` + public/unlisted read).

## What's stored

| Where | What |
|---|---|
| `receipts` table | metadata + the full `manifest.json` (queryable) |
| `receipts` bucket | `index.html`, `manifest.json`, and `media/` (video, screenshots, trace) under `<owner>/<id>/…` |

No telemetry. The only network calls `publish` makes are to the Supabase project
you pointed it at.
