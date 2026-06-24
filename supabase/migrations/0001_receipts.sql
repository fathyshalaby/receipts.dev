-- Receipts — hosted persistence (Phase 2).
--
-- One self-contained receipt becomes: a row here + its files in the `receipts`
-- storage bucket. The PR comment links to the hosted report (index.html) and the
-- raw video. This same schema backs BOTH modes:
--   • BYO  — the user runs `receipts publish` straight against their own project
--            (service key bypasses RLS).
--   • Hosted ("ours") — the CLI POSTs to the `ingest` edge function with an upload
--            token; the function validates it against `api_keys` and writes as the
--            service role. End users never hold the service key.
--
-- Apply in the Supabase SQL editor, or `supabase db push` with the CLI.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto;  -- gen_random_uuid(), digest()

-- ---------------------------------------------------------------------------
-- api_keys — upload tokens for the hosted ingest path
-- ---------------------------------------------------------------------------
-- We never store the raw token. The CLI sends `Bearer <token>`; the edge
-- function hashes it (sha256) and looks up token_hash. Revoke by setting
-- revoked_at. owner_id scopes every receipt the token writes.
create table if not exists public.api_keys (
  id           uuid primary key default gen_random_uuid(),
  token_hash   text not null unique,
  owner_id     uuid references auth.users (id) on delete cascade,
  label        text,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at   timestamptz
);

comment on table public.api_keys is
  'Hosted-mode upload tokens. Raw token is never stored — only sha256(token_hash).';

-- ---------------------------------------------------------------------------
-- receipts — one row per published receipt
-- ---------------------------------------------------------------------------
create table if not exists public.receipts (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null,                       -- the .receipts/<id> folder name
  owner_id         uuid references auth.users (id) on delete cascade,
  repo             text,
  commit           text,
  branch           text,
  pr_number        integer,
  task             text,
  overall_verdict  text,                                -- pass | fail | reasoning-only | visual-only
  summary          jsonb,                               -- QaSummary { pass, fail, inconclusive, not_tested }
  manifest         jsonb not null,                      -- full manifest.json (single source of truth)
  storage_prefix   text not null,                       -- bucket path prefix, e.g. <owner>/<id>
  report_path      text not null,                       -- storage path to index.html
  video_path       text,                                -- storage path to the recorded session video
  report_url       text not null,                       -- public URL to the report
  video_url        text,                                -- public URL to the raw video
  visibility       text not null default 'unlisted',    -- unlisted | public | private
  created_at       timestamptz not null default now()
);

create index if not exists receipts_owner_idx   on public.receipts (owner_id, created_at desc);
create index if not exists receipts_repo_pr_idx on public.receipts (repo, pr_number);

comment on table public.receipts is
  'One published receipt: metadata + a pointer to its files in the receipts storage bucket.';

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- The service role (edge function, BYO direct) bypasses RLS entirely. These
-- policies govern anon/authenticated clients reading the hosted gallery.
alter table public.api_keys enable row level security;
alter table public.receipts enable row level security;

-- api_keys: never readable by anon/authenticated. Only the service role touches it.
-- (No policies = deny all for non-service roles.)

-- receipts: anyone may read a receipt marked public/unlisted (unlisted = link-only,
-- not enumerable in practice because the id is a uuid). Owners read their own.
drop policy if exists "receipts_public_read" on public.receipts;
create policy "receipts_public_read" on public.receipts
  for select
  using (visibility in ('public', 'unlisted'));

drop policy if exists "receipts_owner_read" on public.receipts;
create policy "receipts_owner_read" on public.receipts
  for select
  to authenticated
  using (owner_id = auth.uid());

-- Writes go through the service role only (no insert/update/delete policies).

-- ---------------------------------------------------------------------------
-- Storage bucket
-- ---------------------------------------------------------------------------
-- Public-read bucket so the PR comment's links work with no auth. Files are
-- namespaced under <owner_id>/<receipt_id>/… and the id is an unguessable uuid,
-- so "public bucket" still means "link-only" in practice. Flip to a private
-- bucket + signed URLs if you need hard access control (see docs/hosting.md).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  true,
  104857600,  -- 100 MB per object; bump if your videos run long
  array['text/html','application/json','video/webm','image/png','image/jpeg','application/zip']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public read of objects in the receipts bucket.
drop policy if exists "receipts_objects_public_read" on storage.objects;
create policy "receipts_objects_public_read" on storage.objects
  for select
  using (bucket_id = 'receipts');

-- Writes to the bucket go through the service role only.
