import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, extname } from "node:path";
import { log } from "./util";

/** GitHub's documented web-UI limits. Videos over this are skipped, not truncated. */
export const MAX_GITHUB_VIDEO_BYTES = 100 * 1024 * 1024;

const MIME: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".gif": "image/gif",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

export function mimeForAttachment(file: string): string | null {
  return MIME[extname(file).toLowerCase()] ?? null;
}

export function isGithubVideo(file: string): boolean {
  return [".mp4", ".webm", ".mov"].includes(extname(file).toLowerCase());
}

/** Parse `owner/repo` from a GitHub remote URL, nwo, or https page URL. */
export function parseGithubRepo(input: string | null | undefined): { owner: string; repo: string } | null {
  if (!input) return null;
  const s = String(input).trim();
  const nwo = s.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (nwo) return { owner: nwo[1], repo: nwo[2].replace(/\.git$/, "") };
  const m = s.match(/github\.com[:/]([^/]+)\/([^/#?\s]+)/i);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/, "") };
}

export function resolveGithubToken(env: NodeJS.ProcessEnv = process.env): string | null {
  const direct = env.RECEIPTS_GITHUB_TOKEN || env.GH_TOKEN || env.GITHUB_TOKEN;
  if (direct && direct.trim()) return direct.trim();
  const r = spawnSync("gh", ["auth", "token"], { encoding: "utf8", timeout: 8_000 });
  if (!r.error && r.status === 0) {
    const t = (r.stdout || "").trim();
    if (t) return t;
  }
  return null;
}

export interface GithubUploadResult {
  url: string;
}

/**
 * Upload an image/video to GitHub user-attachments so a PR comment can show a
 * native player. GitHub only autoplays video for `github.com/user-attachments/assets/…`
 * URLs on their own line — raw.githubusercontent.com links stay as downloads.
 *
 * Uses the token-auth upload endpoint (same one `gh --attach` talks to). Actions
 * `ghs_` tokens often 404 here; a `gh auth` / PAT token is the reliable path.
 * Returns null when upload is skipped or fails — never throws for "couldn't attach".
 */
export async function uploadGithubAttachment(opts: {
  file: string;
  owner: string;
  repo: string;
  token: string;
  fetchImpl?: typeof fetch;
}): Promise<string | null> {
  const fetchFn = opts.fetchImpl ?? globalThis.fetch;
  if (!existsSync(opts.file)) return null;
  const mime = mimeForAttachment(opts.file);
  if (!mime) {
    log.warn(`not an attachable type: ${opts.file}`);
    return null;
  }
  let size = 0;
  try {
    size = statSync(opts.file).size;
  } catch {
    return null;
  }
  if (isGithubVideo(opts.file) && size > MAX_GITHUB_VIDEO_BYTES) {
    log.warn(
      `walkthrough video is ${(size / 1024 / 1024).toFixed(1)} MiB (limit 100) — skipping GitHub attach.`
    );
    return null;
  }
  if (size < 32) return null;

  const headers = {
    Authorization: `Bearer ${opts.token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "receipts",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const repoRes = await fetchFn(`https://api.github.com/repos/${opts.owner}/${opts.repo}`, { headers });
  if (!repoRes.ok) {
    log.warn(`GitHub repo lookup failed (${repoRes.status}) — native video attach skipped.`);
    return null;
  }
  const repoJson = (await repoRes.json()) as { id?: number };
  if (!repoJson.id) return null;

  const name = basename(opts.file);
  const qs = new URLSearchParams({
    name,
    content_type: mime,
    repository_id: String(repoJson.id),
  });
  const up = await fetchFn(`https://uploads.github.com/user-attachments/assets?${qs}`, {
    method: "POST",
    headers: {
      ...headers,
      Accept: "application/json",
      "Content-Type": mime,
    },
    body: new Uint8Array(readFileSync(opts.file)),
  });
  if (!up.ok) {
    const hint =
      up.status === 404 || up.status === 403
        ? " (Actions GITHUB_TOKEN often cannot mint user-attachments — GIF fallback still works)"
        : "";
    log.warn(`GitHub video attach failed HTTP ${up.status}${hint}.`);
    return null;
  }
  const body = (await up.json()) as { url?: string; href?: string };
  const url = body.url || body.href;
  if (!url || !url.includes("user-attachments/assets/")) {
    log.warn("GitHub video attach returned no user-attachments URL.");
    return null;
  }
  log.ok(`uploaded walkthrough video → ${url}`);
  return url;
}
