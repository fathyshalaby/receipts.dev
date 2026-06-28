import { describe, it, expect, afterAll } from "vitest";
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runQa, launchBrowser } from "../receipts/scripts/qa";
import { runBuild } from "../receipts/scripts/build";
import { runVerify } from "../receipts/scripts/verify";
import type { Manifest } from "../receipts/scripts/types";

// Golden end-to-end test: drive the *real* pipeline against the bundled demo app
// (no LLM judge, no network) and assert the trust-bearing outputs — the manifest,
// the verdict, the captured frames, and that `verify` proves the receipt intact
// and catches tampering. Skips itself when no browser can launch (so plain
// `npm test` without Chromium still passes); CI installs Chromium and runs it.

const PORT = 3917; // uncommon port to avoid clashing with a dev server
const URL = `http://localhost:${PORT}`;
const outDir = mkdtempSync(join(tmpdir(), "receipts-e2e-"));

afterAll(() => {
  try {
    rmSync(outDir, { recursive: true, force: true });
  } catch {
    /* best effort */
  }
});

async function browserAvailable(): Promise<boolean> {
  try {
    const b = await launchBrowser();
    await b.close();
    return true;
  } catch {
    return false;
  }
}

describe("end-to-end pipeline (demo app)", () => {
  it(
    "qa → build → verify produces an intact, frame-backed receipt",
    { timeout: 180_000 },
    async (ctx) => {
      if (!(await browserAvailable())) ctx.skip();

      const qaCode = await runQa([
        "--input",
        "examples/receipt-input.json",
        "--no-judge",
        "--url",
        URL,
        "--start",
        `PORT=${PORT} node examples/demo-app/server.mjs`,
        "--out",
        outDir,
      ]);
      // Visual-only run (no judge) → exit 0.
      expect(qaCode).toBe(0);

      const buildCode = runBuild(["--in", outDir]);
      expect(buildCode).toBe(0);

      const manifest = JSON.parse(
        readFileSync(join(outDir, "manifest.json"), "utf8")
      ) as Manifest;

      // Verdict + claims wired through correctly.
      expect(manifest.overallVerdict).toBe("visual-only");
      expect(manifest.qa.results).toHaveLength(3);

      // The interactive claim (ac3 has 3 steps) captured a real trajectory.
      const ac3 = manifest.qa.results.find((r) => r.acId === "ac3")!;
      expect(ac3.frames && ac3.frames.length).toBeGreaterThanOrEqual(4);
      expect(existsSync(join(outDir, ac3.frames![0]))).toBe(true);

      // Provenance is recorded (demo claims are agent-authored → self-graded).
      expect(ac3.source).toBe("agent");

      // Integrity block present and covers the evidence files.
      expect(manifest.integrity?.manifestHash).toMatch(/^[0-9a-f]{64}$/);
      expect(Object.keys(manifest.integrity!.files)).toContain("qa-results.json");

      // A fresh receipt verifies clean.
      expect(runVerify(["--in", outDir])).toBe(0);

      // Tamper with an evidence file → verify must fail.
      const qaPath = join(outDir, "qa-results.json");
      writeFileSync(qaPath, readFileSync(qaPath, "utf8") + "\n");
      expect(runVerify(["--in", outDir])).toBe(1);
    }
  );

  it(
    "a signed receipt verifies with the key and fails with the wrong one",
    { timeout: 180_000 },
    async (ctx) => {
      if (!(await browserAvailable())) ctx.skip();
      if (!existsSync(join(outDir, "qa-results.json"))) ctx.skip(); // needs the run above

      // Re-build with a signing key, restoring the qa-results the tamper test edited.
      const qaResults = JSON.parse(
        readFileSync(join(outDir, "qa-results.json"), "utf8")
      );
      writeFileSync(join(outDir, "qa-results.json"), JSON.stringify(qaResults, null, 2));

      process.env.RECEIPTS_SIGNING_KEY = "test-signing-key";
      try {
        expect(runBuild(["--in", outDir])).toBe(0);
        // Correct key → intact.
        expect(runVerify(["--in", outDir, "--key", "test-signing-key"])).toBe(0);
        // Wrong key → signature mismatch.
        expect(runVerify(["--in", outDir, "--key", "not-the-key"])).toBe(1);
      } finally {
        delete process.env.RECEIPTS_SIGNING_KEY;
      }
    }
  );
});
