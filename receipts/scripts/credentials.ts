import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, chmodSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

// Local credential store for `receipts login` / `publish`. Lets a user save a
// hosted upload token (or BYO service creds) once instead of exporting env vars
// every run. Env vars always win over the file, so CI stays env-driven.
//
// Stored at ~/.receipts/config.json (0600). Never commit this file.

export interface ReceiptsConfig {
  /** Hosted-mode upload token. */
  token?: string;
  /** Hosted ingest endpoint override. */
  ingestUrl?: string;
  /** BYO Supabase project URL. */
  supabaseUrl?: string;
  /** BYO Supabase service-role key. */
  supabaseKey?: string;
}

export function configPath(): string {
  return join(homedir(), ".receipts", "config.json");
}

export function loadConfig(): ReceiptsConfig {
  const p = configPath();
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(readFileSync(p, "utf8")) as ReceiptsConfig;
  } catch {
    return {};
  }
}

export function saveConfig(patch: ReceiptsConfig): ReceiptsConfig {
  const p = configPath();
  mkdirSync(dirname(p), { recursive: true });
  const merged = { ...loadConfig(), ...patch };
  // Drop empty keys so the file stays clean.
  for (const k of Object.keys(merged) as (keyof ReceiptsConfig)[]) {
    if (!merged[k]) delete merged[k];
  }
  writeFileSync(p, JSON.stringify(merged, null, 2));
  try {
    chmodSync(p, 0o600);
  } catch {
    /* best-effort on platforms without POSIX perms */
  }
  return merged;
}

export function clearConfig(): boolean {
  const p = configPath();
  if (!existsSync(p)) return false;
  rmSync(p);
  return true;
}

/**
 * Resolve effective credentials: env vars take precedence over the saved config.
 * Pure given (env, fileConfig) — easy to unit test.
 */
export function resolveCredentials(
  env: Record<string, string | undefined>,
  fileConfig: ReceiptsConfig,
): Required<Pick<ReceiptsConfig, never>> & ReceiptsConfig {
  return {
    token: env.RECEIPTS_TOKEN || fileConfig.token,
    ingestUrl: env.RECEIPTS_INGEST_URL || fileConfig.ingestUrl,
    supabaseUrl: env.RECEIPTS_SUPABASE_URL || fileConfig.supabaseUrl,
    supabaseKey: env.RECEIPTS_SUPABASE_KEY || fileConfig.supabaseKey,
  };
}
