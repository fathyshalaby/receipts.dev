import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, relative, posix } from "node:path";
import type { Manifest } from "./types";
import { log, parseFlags } from "./util";
import { loadConfig, resolveCredentials, type ReceiptsConfig } from "./credentials";

// Default hosted ("ours") ingest endpoint. The maintainer wires a real Supabase
// edge function URL here once the project is provisioned; until then, hosted-mode
// users must pass RECEIPTS_INGEST_URL explicitly. BYO mode never touches this.
const DEFAULT_INGEST_URL = process.env.RECEIPTS_INGEST_URL || "";

const BUCKET = "receipts";

/** Which publish path the resolved creds select. Pure — unit-testable. */
export function selectMode(creds: ReceiptsConfig): "byo" | "hosted" | "none" {
  if (creds.supabaseUrl && creds.supabaseKey) return "byo";
  if (creds.token) return "hosted";
  return "none";
}

interface PublishRecord {
  schemaVersion: "1";
  mode: "byo" | "hosted";
  id: string;
  reportUrl: string;
  videoUrl: string | null;
  publishedAt: string;
}

interface UploadFile {
  /** posix-relative path within the receipt, e.g. "index.html" or "media/session.webm". */
  rel: string;
  abs: string;
  contentType: string;
}

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".json": "application/json",
  ".webm": "video/webm",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".zip": "application/zip",
};

function contentTypeFor(rel: string): string {
  const dot = rel.lastIndexOf(".");
  const ext = dot >= 0 ? rel.slice(dot).toLowerCase() : "";
  return CONTENT_TYPES[ext] ?? "application/octet-stream";
}

/** Walk the receipt folder, returning every file as a posix-relative upload entry. */
function collectFiles(dir: string): UploadFile[] {
  const out: UploadFile[] = [];
  const walk = (cur: string) => {
    for (const name of readdirSync(cur)) {
      const abs = join(cur, name);
      if (statSync(abs).isDirectory()) {
        walk(abs);
      } else {
        const rel = relative(dir, abs).split(/[\\/]/).join(posix.sep);
        out.push({ rel, abs, contentType: contentTypeFor(rel) });
      }
    }
  };
  walk(dir);
  return out;
}

function readManifest(dir: string): Manifest {
  const p = join(dir, "manifest.json");
  if (!existsSync(p)) {
    throw new Error(`manifest.json not found in ${dir} — run \`receipts build\` first.`);
  }
  return JSON.parse(readFileSync(p, "utf8")) as Manifest;
}

/** Stable storage prefix so re-publishing a PR keeps the same hosted URL. */
function storagePrefix(m: Manifest): string {
  const pr = m.input?.prNumber;
  if (pr != null) return `pr-${pr}`;
  const branch = (m.input?.branch || "branch")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return branch || "branch";
}

// ---------------------------------------------------------------------------
// BYO mode — talk straight to the user's own Supabase (service key, RLS bypass).
// ---------------------------------------------------------------------------
async function publishByo(
  dir: string,
  m: Manifest,
  files: UploadFile[],
  url: string,
  key: string,
  visibility: string,
): Promise<PublishRecord> {
  const base = url.replace(/\/$/, "");
  const prefix = storagePrefix(m);
  const publicBase = `${base}/storage/v1/object/public/${BUCKET}`;

  for (const f of files) {
    const objectPath = `${prefix}/${f.rel}`;
    const res = await fetch(`${base}/storage/v1/object/${BUCKET}/${objectPath}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        apikey: key,
        "content-type": f.contentType,
        "x-upsert": "true",
      },
      body: readFileSync(f.abs),
    });
    if (!res.ok) {
      throw new Error(`upload failed for ${f.rel} (${res.status}): ${await res.text()}`);
    }
    log.info(`uploaded ${f.rel}`);
  }

  const videoRel = m.qa?.videoPath && files.some((f) => f.rel === m.qa.videoPath) ? m.qa.videoPath : null;
  const reportUrl = `${publicBase}/${prefix}/index.html`;
  const videoUrl = videoRel ? `${publicBase}/${prefix}/${videoRel}` : null;

  const row = {
    slug: prefix,
    repo: m.repo,
    commit: m.commit,
    branch: m.input?.branch ?? null,
    pr_number: m.input?.prNumber ?? null,
    task: m.input?.task ?? null,
    overall_verdict: m.overallVerdict,
    summary: m.qa?.summary ?? null,
    manifest: m,
    storage_prefix: prefix,
    report_path: `${prefix}/index.html`,
    video_path: videoRel ? `${prefix}/${videoRel}` : null,
    report_url: reportUrl,
    video_url: videoUrl,
    visibility,
  };
  const res = await fetch(`${base}/rest/v1/${BUCKET}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      apikey: key,
      "content-type": "application/json",
      prefer: "return=representation",
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    throw new Error(`failed to record receipt row (${res.status}): ${await res.text()}`);
  }
  const [inserted] = (await res.json()) as Array<{ id: string }>;

  return {
    schemaVersion: "1",
    mode: "byo",
    id: inserted?.id ?? prefix,
    reportUrl,
    videoUrl,
    publishedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Hosted mode — POST to the ingest edge function with an upload token, then PUT
// each file to the signed URL it mints. The service key never leaves the server.
// ---------------------------------------------------------------------------
async function publishHosted(
  m: Manifest,
  files: UploadFile[],
  ingestUrl: string,
  token: string,
): Promise<PublishRecord> {
  const create = await fetch(ingestUrl.replace(/\/$/, ""), {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      slug: storagePrefix(m),
      manifest: m,
      files: files.map((f) => ({ path: f.rel, contentType: f.contentType })),
    }),
  });
  if (!create.ok) {
    throw new Error(`ingest rejected the receipt (${create.status}): ${await create.text()}`);
  }
  const out = (await create.json()) as {
    id: string;
    reportUrl: string;
    videoUrl: string | null;
    uploads: { path: string; uploadUrl: string }[];
  };

  const byPath = new Map(files.map((f) => [f.rel, f]));
  for (const u of out.uploads) {
    const f = byPath.get(u.path);
    if (!f) continue;
    const res = await fetch(u.uploadUrl, {
      method: "PUT",
      headers: { "content-type": f.contentType },
      body: readFileSync(f.abs),
    });
    if (!res.ok) {
      throw new Error(`upload failed for ${u.path} (${res.status}): ${await res.text()}`);
    }
    log.info(`uploaded ${u.path}`);
  }

  return {
    schemaVersion: "1",
    mode: "hosted",
    id: out.id,
    reportUrl: out.reportUrl,
    videoUrl: out.videoUrl,
    publishedAt: new Date().toISOString(),
  };
}

export async function runPublish(argv: string[]): Promise<number> {
  const flags = parseFlags(argv);
  const dir = resolve((flags.in as string) || ".");
  const visibility = (flags.visibility as string) || "unlisted";

  let m: Manifest;
  try {
    m = readManifest(dir);
  } catch (e) {
    log.err((e as Error).message);
    return 2;
  }

  const files = collectFiles(dir);
  if (!files.some((f) => f.rel === "index.html")) {
    log.err(`no index.html in ${dir} — run \`receipts build\` first.`);
    return 2;
  }

  // Resolve creds from env (wins) then ~/.receipts/config.json (receipts login).
  const creds = resolveCredentials(process.env, loadConfig());
  const byoUrl = creds.supabaseUrl;
  const byoKey = creds.supabaseKey;
  const token = creds.token;
  const ingestUrl = (flags["ingest-url"] as string) || creds.ingestUrl || DEFAULT_INGEST_URL;

  if (flags["dry-run"]) {
    log.info(`dry run — mode: ${selectMode(creds)}, ${files.length} files, prefix: ${storagePrefix(m)}`);
    for (const f of files) log.info(`  • ${f.rel} (${f.contentType})`);
    return 0;
  }

  let record: PublishRecord;
  try {
    if (byoUrl && byoKey) {
      log.info(`publishing to your Supabase (${byoUrl}) …`);
      record = await publishByo(dir, m, files, byoUrl, byoKey, visibility);
    } else if (token) {
      if (!ingestUrl) {
        log.err(
          "hosted mode needs an ingest endpoint. Set RECEIPTS_INGEST_URL (or pass --ingest-url), " +
            "or use BYO mode with RECEIPTS_SUPABASE_URL + RECEIPTS_SUPABASE_KEY.",
        );
        return 2;
      }
      log.info(`publishing to hosted ingest (${ingestUrl}) …`);
      record = await publishHosted(m, files, ingestUrl, token);
    } else {
      log.err(
        "no Supabase target configured. Set either:\n" +
          "  • BYO:    RECEIPTS_SUPABASE_URL + RECEIPTS_SUPABASE_KEY (service role)\n" +
          "  • Hosted: RECEIPTS_TOKEN (+ RECEIPTS_INGEST_URL if not built in)",
      );
      return 2;
    }
  } catch (e) {
    log.err((e as Error).message);
    return 1;
  }

  writeFileSync(join(dir, "publish.json"), JSON.stringify(record, null, 2));
  log.ok(`published receipt (${record.mode})`);
  log.info(`report: ${record.reportUrl}`);
  if (record.videoUrl) log.info(`video:  ${record.videoUrl}`);
  log.info(`wrote ${join(dir, "publish.json")}`);
  return 0;
}
