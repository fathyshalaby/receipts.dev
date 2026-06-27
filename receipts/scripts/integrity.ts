// Tamper-evidence for a built receipt. A receipt should mean "verifiable", not
// "a folder the author can hand-edit". We bind the receipt to:
//   - a hash of the canonical manifest data (input + qa + metadata), and
//   - a hash of every evidence file (receipt-input.json, qa-results.json, media/*).
// Content hashes make naive edits / truncated media / swapped screenshots
// *detectable* on `receipts verify`. An optional HMAC signature (when a
// RECEIPTS_SIGNING_KEY is present at build time) makes a built receipt
// *unforgeable* by anyone who lacks the key — that's the difference between
// "integrity" (did it change?) and "authenticity" (did *we* produce it?).
//
// index.html, manifest.json, and publish.json are intentionally excluded:
// index.html is regenerable from the manifest (`receipts build`), manifest.json
// carries the integrity block itself, and publish.json is written by a later,
// trusted step. The evidence is the *data + media*, not the rendered HTML.

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { readdirSync, statSync, readFileSync } from "node:fs";
import { join, relative, posix } from "node:path";

export interface Integrity {
  algo: "sha256";
  /** sha256 of the canonical manifest with the `integrity` field removed. */
  manifestHash: string;
  /** posix-relative evidence path -> sha256 of its bytes. */
  files: Record<string, string>;
  /** Present only when built with RECEIPTS_SIGNING_KEY. */
  signature?: { algo: "hmac-sha256"; value: string } | null;
}

/** Files that are derived, self-referential, or added post-build — not evidence. */
const EXCLUDE = new Set(["manifest.json", "index.html", "publish.json"]);

export function sha256Hex(buf: Buffer | string): string {
  return createHash("sha256").update(buf).digest("hex");
}

export function hmacSha256Hex(key: string, msg: string): string {
  return createHmac("sha256", key).update(msg).digest("hex");
}

/** Deterministic JSON: object keys sorted recursively. Pure + unit-tested. */
export function canonicalize(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

function sortDeep(v: any): any {
  if (Array.isArray(v)) return v.map(sortDeep);
  if (v && typeof v === "object") {
    const out: Record<string, any> = {};
    for (const k of Object.keys(v).sort()) out[k] = sortDeep(v[k]);
    return out;
  }
  return v;
}

/** Hash the canonical manifest with any existing `integrity` field stripped. */
export function computeManifestHash(manifest: Record<string, unknown>): string {
  const { integrity: _omit, ...core } = manifest as { integrity?: unknown };
  return sha256Hex(canonicalize(core));
}

/** Hash every evidence file under the receipt dir (excluding derived/meta files). */
export function hashReceiptFiles(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (cur: string) => {
    for (const name of readdirSync(cur)) {
      const abs = join(cur, name);
      if (statSync(abs).isDirectory()) {
        walk(abs);
      } else {
        const rel = relative(dir, abs).split(/[\\/]/).join(posix.sep);
        if (EXCLUDE.has(rel)) continue;
        out[rel] = sha256Hex(readFileSync(abs));
      }
    }
  };
  walk(dir);
  return out;
}

/** The stable byte-string an HMAC signs (manifest hash + every file hash). */
export function signaturePayload(manifestHash: string, files: Record<string, string>): string {
  const lines = [manifestHash, ...Object.keys(files).sort().map((k) => `${k}:${files[k]}`)];
  return lines.join("\n");
}

/** Build the integrity block for a freshly assembled manifest + receipt dir. */
export function computeIntegrity(
  manifest: Record<string, unknown>,
  dir: string,
  signingKey?: string
): Integrity {
  const manifestHash = computeManifestHash(manifest);
  const files = hashReceiptFiles(dir);
  const integrity: Integrity = { algo: "sha256", manifestHash, files, signature: null };
  if (signingKey) {
    integrity.signature = {
      algo: "hmac-sha256",
      value: hmacSha256Hex(signingKey, signaturePayload(manifestHash, files)),
    };
  }
  return integrity;
}

export interface VerifyReport {
  ok: boolean;
  signed: boolean;
  signatureChecked: boolean;
  signatureOk: boolean | null;
  problems: string[];
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

/**
 * Recompute hashes from disk and compare to the stored integrity block.
 * `signingKey` (optional) additionally checks the HMAC signature.
 */
export function verifyIntegrity(
  manifest: Record<string, unknown>,
  dir: string,
  signingKey?: string
): VerifyReport {
  const problems: string[] = [];
  const integrity = (manifest as { integrity?: Integrity }).integrity;
  if (!integrity) {
    return {
      ok: false,
      signed: false,
      signatureChecked: false,
      signatureOk: null,
      problems: ["no integrity block in manifest (built by an older version, or removed)"],
    };
  }

  const manifestHash = computeManifestHash(manifest);
  if (manifestHash !== integrity.manifestHash) {
    problems.push("manifest data was modified after build (manifestHash mismatch)");
  }

  const actual = hashReceiptFiles(dir);
  for (const [rel, hash] of Object.entries(integrity.files)) {
    if (!(rel in actual)) problems.push(`missing evidence file: ${rel}`);
    else if (actual[rel] !== hash) problems.push(`evidence file modified: ${rel}`);
  }
  for (const rel of Object.keys(actual)) {
    if (!(rel in integrity.files)) problems.push(`unexpected extra file: ${rel}`);
  }

  const signed = !!integrity.signature;
  let signatureChecked = false;
  let signatureOk: boolean | null = null;
  if (signed) {
    if (signingKey) {
      signatureChecked = true;
      const expected = hmacSha256Hex(
        signingKey,
        signaturePayload(integrity.manifestHash, integrity.files)
      );
      signatureOk = safeEqualHex(expected, integrity.signature!.value);
      if (!signatureOk) problems.push("HMAC signature does not match (wrong key or forged)");
    } else {
      problems.push("receipt is signed but no RECEIPTS_SIGNING_KEY was provided to verify it");
    }
  }

  return { ok: problems.length === 0, signed, signatureChecked, signatureOk, problems };
}
