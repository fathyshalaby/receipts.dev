# Receipts — Web (multiplayer review gallery)

The hosted gallery for the **Receipts** product. A logged-in user browses the
receipts they own: verified, video-backed proof of what an agent shipped.

This app is **read-only**. It never writes receipts — those are written by
`receipts publish` (service-role) into Supabase. This app reads `public.receipts`
under Row Level Security, so a user only ever sees rows where
`owner_id = auth.uid()` (plus any `public` / `unlisted` rows the policies allow).

Owner-scoped rows shown in the gallery come from **hosted-mode** publishes, where
`receipts publish` sets `owner_id` to the publishing user.

## Stack

- Next.js 15 (App Router) · React 19 · TypeScript 5
- Supabase auth + data via `@supabase/supabase-js` + `@supabase/ssr`
  (cookie-based sessions, email magic-link / OTP)
- Hand-authored CSS (`app/globals.css`) — no Tailwind, no UI library

## Routes

| Route             | Description                                                      |
| ----------------- | ---------------------------------------------------------------- |
| `/login`          | Email magic-link sign-in                                         |
| `/auth/callback`  | Exchanges the OTP code for a session, redirects to `/`           |
| `/`               | Gallery — your receipts, filterable by `?repo=` and `?verdict=`  |
| `/r/[id]`         | Receipt detail — facts, acceptance criteria, embedded report     |

`middleware.ts` refreshes the session cookie on every request and redirects
unauthenticated users away from `/` and `/r/*`.

## Environment

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
```

The anon key is safe in the browser — RLS protects all data. This app uses no
service-role key.

> **Supabase email auth:** in the Supabase dashboard, enable Email provider and
> add `http://localhost:3000/auth/callback` (and your production callback URL)
> to **Authentication → URL Configuration → Redirect URLs**.

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
```

Other scripts: `npm run build`, `npm run start`, `npm run lint`,
`npm run typecheck`.

Requires Node >= 18.18.
