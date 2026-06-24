import { chromium } from "playwright";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import type {
  ReceiptInput,
  QaResults,
  QaResult,
  Verdict,
  AcceptanceCriterion,
} from "./types";
import { log, parseFlags, receiptId, VIEWPORTS } from "./util";
import { judgeEnabled, judgeClaim } from "./judge";

interface QaOptions {
  input: string;
  url?: string;
  start?: string;
  noJudge: boolean;
  out?: string;
}

function readInput(p: string): ReceiptInput {
  if (!existsSync(p)) {
    log.err(`receipt-input.json not found at ${p}`);
    process.exit(2);
  }
  return JSON.parse(readFileSync(p, "utf8"));
}

async function waitForUrl(url: string, timeoutMs = 60_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { method: "GET" });
      if (res.ok || res.status < 500) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

function startApp(cmd: string): ChildProcess {
  log.info(`booting app: ${cmd}`);
  // detached:true puts the shell + its children in their own process group so we
  // can kill the whole tree later (killing just the shell would orphan the app).
  const child = spawn(cmd, {
    shell: true,
    stdio: "ignore",
    detached: process.platform !== "win32",
  });
  return child;
}

/** Kill the booted app and everything it spawned (the whole process group). */
function killApp(proc: ChildProcess | null): void {
  if (!proc || proc.pid == null) return;
  try {
    if (process.platform === "win32") proc.kill();
    else process.kill(-proc.pid, "SIGTERM"); // negative pid → process group
  } catch {
    try {
      proc.kill();
    } catch {
      /* already gone */
    }
  }
}

function emptyResults(reasoningOnly: boolean): QaResults {
  return {
    schemaVersion: "1",
    startedAt: new Date().toISOString(),
    durationMs: 0,
    videoPath: null,
    tracePath: null,
    reasoningOnly,
    results: [],
    summary: { pass: 0, fail: 0, inconclusive: 0, not_tested: 0 },
  };
}

function summarize(results: QaResult[]): QaResults["summary"] {
  const s = { pass: 0, fail: 0, inconclusive: 0, not_tested: 0 };
  for (const r of results) s[r.verdict]++;
  return s;
}

/** Exit code: non-zero only if any claim fails or is inconclusive (CI-gateable, PRD §9). */
function exitCodeFor(summary: QaResults["summary"]): number {
  return summary.fail > 0 || summary.inconclusive > 0 ? 1 : 0;
}

async function runSteps(page: import("playwright").Page, steps: AcceptanceCriterion["steps"]) {
  if (!steps) return;
  for (const step of steps) {
    switch (step.action) {
      case "goto":
        await page.goto(String(step.value ?? ""), { waitUntil: "domcontentloaded" });
        break;
      case "click":
        if (step.selector) await page.click(step.selector, { timeout: 10_000 });
        break;
      case "fill":
        if (step.selector) await page.fill(step.selector, String(step.value ?? ""));
        break;
      case "press":
        if (step.selector) await page.press(step.selector, String(step.value ?? "Enter"));
        else await page.keyboard.press(String(step.value ?? "Enter"));
        break;
      case "hover":
        if (step.selector) await page.hover(step.selector);
        break;
      case "select":
        if (step.selector) await page.selectOption(step.selector, String(step.value ?? ""));
        break;
      case "wait":
        await page.waitForTimeout(Number(step.value ?? 500));
        break;
    }
  }
}

export async function runQa(argv: string[]): Promise<number> {
  const flags = parseFlags(argv);
  const opts: QaOptions = {
    input: (flags.input as string) || "receipt-input.json",
    url: flags.url as string | undefined,
    start: flags.start as string | undefined,
    noJudge: flags["no-judge"] === true,
    out: flags.out as string | undefined,
  };

  const input = readInput(opts.input);
  const targetUrl = opts.url || input.targetUrl;
  const startCommand = opts.start || input.startCommand || null;
  const outDir = resolve(
    opts.out || join(".receipts", receiptId(input.prNumber, input.branch))
  );
  const mediaDir = join(outDir, "media");
  mkdirSync(mediaDir, { recursive: true });

  // Always co-locate the input so `build` can read from one folder.
  writeFileSync(join(outDir, "receipt-input.json"), JSON.stringify(input, null, 2));

  const criteria = input.acceptanceCriteria ?? [];

  // Graceful degradation (PRD §9): nothing visual to test → reasoning-only receipt, exit 0.
  if (criteria.length === 0 || !targetUrl) {
    log.warn(
      criteria.length === 0
        ? "no acceptanceCriteria — emitting a reasoning-only receipt (no visual QA)."
        : "no targetUrl — emitting a reasoning-only receipt (no visual QA)."
    );
    const results = emptyResults(true);
    writeFileSync(join(outDir, "qa-results.json"), JSON.stringify(results, null, 2));
    log.ok(`receipt input + reasoning-only qa-results written to ${outDir}`);
    return 0;
  }

  const judging = judgeEnabled(opts.noJudge);
  log.info(`target: ${targetUrl}  |  claims: ${criteria.length}  |  judge: ${judging ? "llm" : "none"}`);

  // Boot the app if asked, and wait for it.
  let appProc: ChildProcess | null = null;
  if (startCommand) {
    appProc = startApp(startCommand);
    const up = await waitForUrl(targetUrl);
    if (!up) {
      killApp(appProc);
      log.err(`app did not become reachable at ${targetUrl} within timeout.`);
      return 2;
    }
    log.ok(`app is up at ${targetUrl}`);
  }

  const startedAt = new Date();
  let browser;
  try {
    browser = await chromium.launch();
  } catch (e: any) {
    killApp(appProc);
    log.err(
      `could not launch Chromium: ${e?.message ?? e}\n` +
        `         Install the browser first: npx playwright install chromium`
    );
    return 2;
  }
  const context = await browser.newContext({
    viewport: VIEWPORTS.desktop,
    recordVideo: { dir: mediaDir, size: VIEWPORTS.desktop },
  });
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  const page = await context.newPage();

  const results: QaResult[] = [];
  for (const c of criteria) {
    try {
      const vp = (c.viewport && VIEWPORTS[c.viewport]) || VIEWPORTS.desktop;
      await page.setViewportSize(vp);

      const dest = c.path ? new URL(c.path, targetUrl).toString() : targetUrl;
      log.info(`▶ ${c.id}: ${c.claim}`);
      await page.goto(dest, { waitUntil: "networkidle" }).catch(async () => {
        await page.goto(dest, { waitUntil: "domcontentloaded" });
      });
      await page.waitForTimeout(300);

      // "before" only meaningful when steps will change the page.
      const hasSteps = !!(c.steps && c.steps.length);
      let beforeRel: string | null = null;
      if (hasSteps) {
        beforeRel = `media/${c.id}-before.png`;
        await page.screenshot({ path: join(outDir, beforeRel), fullPage: false });
        await runSteps(page, c.steps);
        await page.waitForTimeout(300);
      }
      const afterRel = `media/${c.id}-after.png`;
      await page.screenshot({ path: join(outDir, afterRel), fullPage: false });

      let verdict: Verdict = "not_tested";
      let rationale: string | null = null;
      if (judging) {
        const v = await judgeClaim(
          c,
          beforeRel ? join(outDir, beforeRel) : null,
          join(outDir, afterRel)
        );
        verdict = v.verdict;
        rationale = v.rationale;
      }
      log.info(`   ↳ ${verdict}${rationale ? ` — ${rationale.slice(0, 80)}` : ""}`);

      results.push({
        acId: c.id,
        claim: c.claim,
        verdict,
        judge: judging ? "llm" : "none",
        rationale,
        screenshots: { before: beforeRel, after: afterRel },
      });
    } catch (e: any) {
      // A flaky claim should not crash the whole run — record it as inconclusive.
      log.warn(`${c.id} errored: ${e?.message ?? e}`);
      const afterRel = `media/${c.id}-after.png`;
      results.push({
        acId: c.id,
        claim: c.claim,
        verdict: "inconclusive",
        judge: judging ? "llm" : "none",
        rationale: `QA step failed: ${e?.message ?? e}`,
        screenshots: {
          before: null,
          after: existsSync(join(outDir, afterRel)) ? afterRel : "media/missing.png",
        },
      });
    }
  }

  // Finalize: stop trace, save video, tear down, write results.
  const traceRel = "media/trace.zip";
  await context.tracing.stop({ path: join(outDir, traceRel) }).catch(() => {});
  const video = page.video();
  await context.close();
  let videoRel: string | null = null;
  if (video) {
    try {
      await video.saveAs(join(mediaDir, "session.webm"));
      videoRel = "media/session.webm";
    } catch {
      /* video may be unavailable in some environments */
    }
  }
  await browser.close();
  killApp(appProc);

  const summary = summarize(results);
  const out: QaResults = {
    schemaVersion: "1",
    startedAt: startedAt.toISOString(),
    durationMs: Date.now() - startedAt.getTime(),
    videoPath: videoRel,
    tracePath: existsSync(join(outDir, traceRel)) ? traceRel : null,
    reasoningOnly: false,
    results,
    summary,
  };
  writeFileSync(join(outDir, "qa-results.json"), JSON.stringify(out, null, 2));
  log.ok(
    `qa complete → ${outDir}  (pass:${summary.pass} fail:${summary.fail} ` +
      `inconclusive:${summary.inconclusive} not_tested:${summary.not_tested})`
  );
  return exitCodeFor(summary);
}
