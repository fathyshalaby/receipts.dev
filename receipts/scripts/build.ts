import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { ReceiptInput, QaResults, Manifest, OverallVerdict } from "./types";
import { log, parseFlags, generatorVersion, gitInfo } from "./util";
import { renderReport } from "./report";

function readJson<T>(p: string): T {
  return JSON.parse(readFileSync(p, "utf8"));
}

function overallVerdict(qa: QaResults): OverallVerdict {
  if (qa.reasoningOnly || qa.results.length === 0) return "reasoning-only";
  if (qa.summary.fail > 0 || qa.summary.inconclusive > 0) return "fail";
  if (qa.summary.pass === qa.results.length && qa.summary.pass > 0) return "pass";
  // Everything was not_tested (visual-only / --no-judge).
  return "visual-only";
}

export function runBuild(argv: string[]): number {
  const flags = parseFlags(argv);
  const inDir = resolve((flags.in as string) || ".");

  const inputPath = join(inDir, "receipt-input.json");
  const qaPath = join(inDir, "qa-results.json");
  if (!existsSync(inputPath)) {
    log.err(`receipt-input.json not found in ${inDir}. Run \`receipts qa\` first.`);
    return 2;
  }
  if (!existsSync(qaPath)) {
    log.err(`qa-results.json not found in ${inDir}. Run \`receipts qa\` first.`);
    return 2;
  }

  const input = readJson<ReceiptInput>(inputPath);
  const qa = readJson<QaResults>(qaPath);
  const { repo, commit } = gitInfo();

  const manifest: Manifest = {
    schemaVersion: "1",
    generatorVersion: generatorVersion(),
    generatedAt: new Date().toISOString(),
    overallVerdict: overallVerdict(qa),
    repo,
    commit,
    input,
    qa,
  };

  writeFileSync(join(inDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  const html = renderReport(manifest);
  writeFileSync(join(inDir, "index.html"), html);

  log.ok(`built receipt → ${join(inDir, "index.html")}  (overall: ${manifest.overallVerdict})`);
  log.info(`open it with: receipts open --in ${flags.in || inDir}`);
  return 0;
}
