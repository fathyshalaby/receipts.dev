// Receipts — hosted ingest ("ours" mode).
//
// The CLI's `receipts publish` (hosted mode) calls this with an upload token.
// We never hand end users the service role key; this function holds it and does
// the privileged writes. Flow (signed-upload-URL protocol — keeps big video
// bytes off the function, the CLI streams them straight to storage):
//
//   1. CLI  → POST /ingest  { manifest, files: [{ path, contentType }] }
//             Authorization: Bearer <upload-token>
//   2. here → validate token, mint signed upload URLs, insert the receipts row,
//             return { id, reportUrl, videoUrl, uploads: [{ path, uploadUrl }] }
//   3. CLI  → PUT each file to its uploadUrl (token is in the URL; no auth header)
//
// Deploy: `supabase functions deploy ingest --no-verify-jwt`
// (we do our own bearer-token auth; Supabase JWT verification must be off).
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, json, sha256Hex } from "../_shared/cors.ts";

const BUCKET = "receipts";

interface IngestFile {
  path: string; // relative within the receipt, e.g. "index.html" or "media/session.webm"
  contentType?: string;
}

interface IngestBody {
  slug?: string;
  manifest: Record<string, unknown>;
  files: IngestFile[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json({ error: "server misconfigured: missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY" }, 500);
  }

  // --- auth: Bearer <upload-token> → api_keys ---
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) return json({ error: "missing upload token (Authorization: Bearer <token>)" }, 401);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const tokenHash = await sha256Hex(token);
  const { data: key, error: keyErr } = await admin
    .from("api_keys")
    .select("id, owner_id, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (keyErr) return json({ error: "auth lookup failed" }, 500);
  if (!key || key.revoked_at) return json({ error: "invalid or revoked token" }, 401);

  // --- body ---
  let body: IngestBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }
  if (!body?.manifest || !Array.isArray(body.files) || body.files.length === 0) {
    return json({ error: "body must include { manifest, files: [...] }" }, 400);
  }
  if (!body.files.some((f) => f.path === "index.html")) {
    return json({ error: "files must include index.html (the report)" }, 400);
  }

  const id = crypto.randomUUID();
  const prefix = `${key.owner_id ?? "anon"}/${id}`;
  const publicBase = `${supabaseUrl}/storage/v1/object/public/${BUCKET}`;

  // --- mint a signed upload URL per file ---
  const uploads: { path: string; uploadUrl: string }[] = [];
  for (const f of body.files) {
    const objectPath = `${prefix}/${f.path}`;
    const { data: signed, error: signErr } = await admin.storage
      .from(BUCKET)
      .createSignedUploadUrl(objectPath);
    if (signErr || !signed) {
      return json({ error: `failed to sign upload for ${f.path}: ${signErr?.message}` }, 500);
    }
    // signed.signedUrl is relative ("/object/upload/sign/receipts/...?token=..").
    uploads.push({ path: f.path, uploadUrl: `${supabaseUrl}/storage/v1${signed.signedUrl}` });
  }

  // --- derive public URLs + summary from the manifest ---
  const m = body.manifest as Record<string, any>;
  // The recorded session is manifest.qa.videoPath ("media/session.webm"); fall
  // back to any .webm in the upload set. Screenshots also live under media/, so
  // never match on the folder alone.
  const manifestVideo: string | null = m?.qa?.videoPath ?? null;
  const videoFile =
    (manifestVideo && body.files.some((f) => f.path === manifestVideo) ? manifestVideo : null) ??
    body.files.find((f) => /\.webm$/i.test(f.path))?.path;
  const reportUrl = `${publicBase}/${prefix}/index.html`;
  const videoUrl = videoFile ? `${publicBase}/${prefix}/${videoFile}` : null;

  const { error: insErr } = await admin.from("receipts").insert({
    id,
    slug: body.slug ?? m?.input?.branch ?? id,
    owner_id: key.owner_id ?? null,
    repo: m?.repo ?? null,
    commit: m?.commit ?? null,
    branch: m?.input?.branch ?? null,
    pr_number: m?.input?.prNumber ?? null,
    task: m?.input?.task ?? null,
    overall_verdict: m?.overallVerdict ?? null,
    summary: m?.qa?.summary ?? null,
    manifest: m,
    storage_prefix: prefix,
    report_path: `${prefix}/index.html`,
    video_path: videoFile ? `${prefix}/${videoFile}` : null,
    report_url: reportUrl,
    video_url: videoUrl,
  });
  if (insErr) return json({ error: `failed to record receipt: ${insErr.message}` }, 500);

  await admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", key.id);

  return json({ id, reportUrl, videoUrl, uploads });
});
