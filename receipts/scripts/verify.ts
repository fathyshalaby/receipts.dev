import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Manifest } from "./types";
import { log, parseFlags } from "./util";
import { verifyIntegrity } from "./integrity";

/**
 * `receipts verify --in .receipts/<id>` — recompute the receipt's content hashes
 * and compare them to the integrity block written by `build`. With
 * RECEIPTS_SIGNING_KEY set (or --key), also checks the HMAC signature.
 *
 * Exit 0 only when the receipt is intact; non-zero on any tamper/mismatch so CI
 * can refuse a doctored receipt.
 */
export function runVerify(argv: string[]): number {
  const flags = parseFlags(argv);
  const inDir = resolve((flags.in as string) || ".");
  const manifestPath = join(inDir, "manifest.json");
  if (!existsSync(manifestPath)) {
    log.err(`manifest.json not found in ${inDir}. Run \`receipts build\` first.`);
    return 2;
  }

  let manifest: Manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Manifest;
  } catch (e) {
    log.err(`could not read manifest.json: ${(e as Error).message}`);
    return 2;
  }

  const signingKey = (flags.key as string) || process.env.RECEIPTS_SIGNING_KEY || undefined;
  const report = verifyIntegrity(manifest as unknown as Record<string, unknown>, inDir, signingKey);

  if (report.ok) {
    const how = report.signatureChecked
      ? "content hashes + HMAC signature verified"
      : report.signed
        ? "content hashes verified (signed; pass --key or RECEIPTS_SIGNING_KEY to check the signature)"
        : "content hashes verified (unsigned — integrity only, not authenticity)";
    log.ok(`receipt is intact — ${how}.`);
    return 0;
  }

  log.err(`receipt FAILED verification (${report.problems.length} problem(s)):`);
  for (const p of report.problems) log.err(`  • ${p}`);
  return 1;
}
