import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

export const log = {
  info: (m: string) => console.log(`[receipts] ${m}`),
  warn: (m: string) => console.warn(`[receipts] ⚠ ${m}`),
  err: (m: string) => console.error(`[receipts] ✖ ${m}`),
  ok: (m: string) => console.log(`[receipts] ✓ ${m}`),
};

/** Minimal `--flag value` / `--bool` parser. Returns a map of flag -> string|true. */
export function parseFlags(argv: string[]): Record<string, string | true> {
  const out: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      out[key] = true;
    } else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

/** Receipt folder id: pr-<n> when a PR number exists, else a sanitized branch name. */
export function receiptId(prNumber: number | null, branch: string): string {
  if (prNumber != null) return `pr-${prNumber}`;
  const slug = (branch || "branch")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return slug || "branch";
}

export function generatorVersion(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(join(here, "..", "..", "package.json"), "utf8")
    );
    return `receipts@${pkg.version}`;
  } catch {
    return "receipts@0.0.0";
  }
}

export function gitInfo(): { repo: string | null; commit: string | null } {
  const git = (args: string[]): string | null => {
    try {
      return execFileSync("git", args, { encoding: "utf8" }).trim();
    } catch {
      return null;
    }
  };
  const commit = git(["rev-parse", "HEAD"]);
  let repo = git(["config", "--get", "remote.origin.url"]);
  if (repo) {
    repo = repo
      .replace(/^git@([^:]+):/, "https://$1/")
      .replace(/\.git$/, "");
  }
  return { repo, commit };
}

export const VIEWPORTS: Record<string, { width: number; height: number }> = {
  desktop: { width: 1280, height: 800 },
  tablet: { width: 834, height: 1112 },
  mobile: { width: 390, height: 844 },
};

/** Escape a string for safe interpolation into HTML text/attributes. */
export function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
