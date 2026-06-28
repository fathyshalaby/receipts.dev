import { chromium, type Browser } from "playwright";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import type {
  ReceiptInput,
  QaResults,
  QaResult,
  Verdict,
  AcceptanceCriterion,
} from "./types";
import { log, parseFlags, receiptId, VIEWPORTS } from "./util";
import { judgeEnabled, judgeClaim, refuteClaim, reconcileVerdict } from "./judge";
import { navEnabled, llmNavigate, type NavOutcome } from "./nav";

// Cap intermediate (per-step) frames captured per claim so the judge payload and
// the receipt stay bounded. before + up to this many mids + after.
const MAX_MID_FRAMES = 4;
// Bound the "settle" wait so a never-idle app can't stall the whole run.
const NETWORK_IDLE_TIMEOUT = 5_000;
const SETTLE_MS = 150;

const BUDGET_NOTE =
  "Judge-call budget exhausted (cost ceiling) — remaining claims were left not_tested.";

interface QaOptions {
  input: string;
  url?: string;
  start?: string;
  contract?: string;
  noJudge: boolean;
  noAdversarial: boolean;
  /** Max vision-model calls per run (primary + adversarial). 0 = unlimited. */
  maxJudgeCalls: number;
  out?: string;
}

/**
 * Launch Chromium, falling back to a system browser channel when the pinned
 * Playwright build isn't present (locked-down CI / sandbox that can't fetch it).
 * `RECEIPTS_CHROMIUM_PATH` forces a specific executable.
 */
export async function launchBrowser(): Promise<Browser> {
  const execPath = process.env.RECEIPTS_CHROMIUM_PATH;
  try {
    return await chromium.launch(execPath ? { executablePath: execPath } : {});
  } catch (e) {
    for (const channel of ["chrome", "chromium", "msedge"]) {
      try {
        return await chromium.launch({ channel });
      } catch {
        /* try the next channel */
      }
    }
    throw e;
  }
}

function readInput(p: string): ReceiptInput {
  if (!existsSync(p)) {
    log.err(`receipt-input.json not found at ${p}`);
    process.exit(2);
  }
  return JSON.parse(readFileSync(p, "utf8"));
}

/** Load an independent acceptance contract (array, or { acceptanceCriteria }). */
function readContract(p: string): AcceptanceCriterion[] {
  if (!existsSync(p)) {
    log.err(`contract file not found at ${p}`);
    process.exit(2);
  }
  const raw = JSON.parse(readFileSync(p, "utf8"));
  const list: unknown = Array.isArray(raw) ? raw : raw?.acceptanceCriteria;
  if (!Array.isArray(list)) {
    log.err(`contract ${p} must be a JSON array of criteria or { "acceptanceCriteria": [...] }`);
    process.exit(2);
  }
  for (const c of list as any[]) {
    if (!c || typeof c.id !== "string" || typeof c.claim !== "string") {
      log.err(`contract ${p}: every criterion needs a string \`id\` and \`claim\`.`);
      process.exit(2);
    }
  }
  return list as AcceptanceCriterion[];
}

/**
 * Merge the agent's input claims with an optional independent contract, tagging
 * provenance. Contract claims win on id collision. Pure — unit-tested.
 */
export function mergeCriteria(
  input: ReceiptInput,
  contract?: AcceptanceCriterion[]
): AcceptanceCriterion[] {
  const byId = new Map<string, AcceptanceCriterion>();
  for (const c of input.acceptanceCriteria ?? []) {
    byId.set(c.id, { ...c, source: c.source ?? "agent" });
  }
  if (contract) {
    for (const c of contract) byId.set(c.id, { ...c, source: c.source ?? "contract" });
  }
  return [...byId.values()];
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

/** Wait for the page to go quiet without a blind sleep; bounded so it can't stall. */
async function settle(page: import("playwright").Page): Promise<void> {
  await page.waitForLoadState("networkidle", { timeout: NETWORK_IDLE_TIMEOUT }).catch(() => {});
  await page.waitForTimeout(SETTLE_MS);
}

async function runSteps(
  page: import("playwright").Page,
  steps: AcceptanceCriterion["steps"],
  onStep?: (i: number) => Promise<void>
) {
  if (!steps) return;
  let i = 0;
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
    if (onStep) await onStep(i++);
  }
}

export async function runQa(argv: string[]): Promise<number> {
  const flags = parseFlags(argv);
  const opts: QaOptions = {
    input: (flags.input as string) || "receipt-input.json",
    url: flags.url as string | undefined,
    start: flags.start as string | undefined,
    contract: flags.contract as string | undefined,
    noJudge: flags["no-judge"] === true,
    noAdversarial: flags["no-adversarial"] === true,
    maxJudgeCalls:
      Number(flags["max-judge-calls"] ?? process.env.RECEIPTS_MAX_JUDGE_CALLS ?? 0) || 0,
    out: flags.out as string | undefined,
  };

  const input = readInput(opts.input);
  const contract = opts.contract ? readContract(opts.contract) : undefined;
  const criteria = mergeCriteria(input, contract);
  const targetUrl = opts.url || input.targetUrl;
  const startCommand = opts.start || input.startCommand || null;
  const outDir = resolve(
    opts.out || join(".receipts", receiptId(input.prNumber, input.branch))
  );
  const mediaDir = join(outDir, "media");
  mkdirSync(mediaDir, { recursive: true });

  // Always co-locate the input so `build` can read from one folder.
  writeFileSync(join(outDir, "receipt-input.json"), JSON.stringify(input, null, 2));

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
  const independent = criteria.filter((c) => c.source && c.source !== "agent").length;
  log.info(
    `target: ${targetUrl}  |  claims: ${criteria.length} (${independent} independent)  ` +
      `|  judge: ${judging ? "llm" : "none"}` +
      (opts.maxJudgeCalls > 0 ? `  |  budget: ${opts.maxJudgeCalls} calls` : "")
  );

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
    browser = await launchBrowser();
  } catch (e: any) {
    killApp(appProc);
    log.err(
      `could not launch Chromium: ${e?.message ?? e}\n` +
        `         Install the browser first: npx playwright install chromium,\n` +
        `         or point RECEIPTS_CHROMIUM_PATH at an existing Chrome/Chromium binary.`
    );
    return 2;
  }
  const context = await browser.newContext({
    viewport: VIEWPORTS.desktop,
    recordVideo: { dir: mediaDir, size: VIEWPORTS.desktop },
  });
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  const page = await context.newPage();

  const runNotes: string[] = [];
  let judgeCalls = 0;
  const budgetLeft = () => opts.maxJudgeCalls <= 0 || judgeCalls < opts.maxJudgeCalls;

  // One attempt at a claim: navigate, capture the trajectory, judge, challenge.
  // May throw (flaky step / selector) — the caller retries once.
  const attemptClaim = async (c: AcceptanceCriterion): Promise<QaResult> => {
    const vp = (c.viewport && VIEWPORTS[c.viewport]) || VIEWPORTS.desktop;
    await page.setViewportSize(vp);

    const dest = c.path ? new URL(c.path, targetUrl).toString() : targetUrl;
    log.info(`▶ ${c.id}: ${c.claim}`);
    await page.goto(dest, { waitUntil: "domcontentloaded" });
    await settle(page);

    // Chronological frames the judge will see: before → per-step → after.
    const frameRels: string[] = [];
    let mids = 0;
    const captureMid = async () => {
      if (mids >= MAX_MID_FRAMES) return;
      const rel = `media/${c.id}-step${mids++}.png`;
      await page.screenshot({ path: join(outDir, rel), fullPage: true });
      frameRels.push(rel);
    };

    const hasSteps = !!(c.steps && c.steps.length);
    const useLlmNav = !hasSteps && !!c.navigationHint && navEnabled();
    let beforeRel: string | null = null;
    let nav: QaResult["nav"] = { mode: "none" };
    let navOutcome: NavOutcome | null = null;
    if (hasSteps || useLlmNav) {
      beforeRel = `media/${c.id}-before.png`;
      await page.screenshot({ path: join(outDir, beforeRel), fullPage: true });
      frameRels.push(beforeRel);
      if (hasSteps) {
        await runSteps(page, c.steps, captureMid);
        nav = { mode: "deterministic" };
      } else {
        navOutcome = await llmNavigate(page, c.navigationHint!, captureMid);
        nav = { mode: "llm", note: navOutcome.note };
        log.info(`   ↳ ${navOutcome.note}`);
      }
      await settle(page);
    }
    const afterRel = `media/${c.id}-after.png`;
    await page.screenshot({ path: join(outDir, afterRel), fullPage: true });
    frameRels.push(afterRel);

    let verdict: Verdict = "not_tested";
    let rationale: string | null = null;
    let adversarial: QaResult["adversarial"] = null;
    if (judging && !budgetLeft()) {
      rationale = "Judge call budget exhausted for this run (cost ceiling).";
      if (!runNotes.includes(BUDGET_NOTE)) runNotes.push(BUDGET_NOTE);
    } else if (judging) {
      const framesAbs = frameRels.map((r) => join(outDir, r));
      judgeCalls++;
      const v = await judgeClaim(c, framesAbs);
      verdict = v.verdict;
      rationale = v.rationale;
      // Don't let a self-authored claim wave itself through: challenge passes.
      if (verdict === "pass" && !opts.noAdversarial) {
        if (budgetLeft()) {
          judgeCalls++;
          const ref = await refuteClaim(c, framesAbs);
          adversarial = { refuted: ref.refuted, rationale: ref.rationale };
          const reconciled = reconcileVerdict(verdict, ref.refuted);
          if (reconciled !== verdict) {
            verdict = reconciled;
            rationale = `${rationale}\n\n⚠ Adversarial check refuted this pass: ${ref.rationale}`;
            log.info(`   ↳ adversarial refuted pass → ${verdict}`);
          }
        } else {
          rationale = `${rationale}\n\n(adversarial check skipped — judge budget exhausted)`;
        }
      }
      // Wrong-screen guard: an LLM-nav pass that didn't finish its own plan can't
      // be trusted — the final screen may not be the state the claim describes.
      if (verdict === "pass" && navOutcome && navOutcome.ran < navOutcome.planned.length) {
        verdict = "inconclusive";
        rationale =
          `${rationale}\n\n⚠ Downgraded: AI navigation ran only ${navOutcome.ran}/` +
          `${navOutcome.planned.length} planned steps, so the final screen may not be the intended state.`;
        log.info(`   ↳ nav incomplete (${navOutcome.ran}/${navOutcome.planned.length}) → inconclusive`);
      }
    }
    log.info(`   ↳ ${verdict}${rationale ? ` — ${rationale.slice(0, 80)}` : ""}`);

    return {
      acId: c.id,
      claim: c.claim,
      verdict,
      judge: judging ? "llm" : "none",
      rationale,
      screenshots: { before: beforeRel, after: afterRel },
      frames: frameRels,
      adversarial,
      source: c.source,
      nav,
    };
  };

  const results: QaResult[] = [];
  for (const c of criteria) {
    let res: QaResult | null = null;
    for (let attempt = 1; attempt <= 2 && !res; attempt++) {
      try {
        res = await attemptClaim(c);
      } catch (e: any) {
        const msg = e?.message ?? e;
        if (attempt < 2) {
          log.warn(`${c.id} errored (attempt ${attempt}) — retrying once: ${msg}`);
        } else {
          // A flaky claim should not crash the whole run — record it as inconclusive.
          log.warn(`${c.id} failed after retry: ${msg}`);
          const afterRel = `media/${c.id}-after.png`;
          res = {
            acId: c.id,
            claim: c.claim,
            verdict: "inconclusive",
            judge: judging ? "llm" : "none",
            rationale: `QA step failed after retry: ${msg}`,
            screenshots: {
              before: null,
              after: existsSync(join(outDir, afterRel)) ? afterRel : "media/missing.png",
            },
            source: c.source,
            nav: { mode: "none" },
          };
        }
      }
    }
    results.push(res!);
  }

  // Finalize: stop trace, save video, tear down, write results.
  const traceRel = "media/trace.zip";
  await context.tracing.stop({ path: join(outDir, traceRel) }).catch(() => {});
  const video = page.video();
  // Grab the raw recording path before close() so we can remove it after copying
  // — otherwise the receipt ships (and publishes) the video twice.
  const rawVideoPath = video ? await video.path().catch(() => null) : null;
  await context.close();
  let videoRel: string | null = null;
  if (video) {
    try {
      const dest = join(mediaDir, "session.webm");
      await video.saveAs(dest);
      videoRel = "media/session.webm";
      if (rawVideoPath && resolve(rawVideoPath) !== resolve(dest)) {
        try {
          unlinkSync(rawVideoPath);
        } catch {
          /* original already gone */
        }
      }
    } catch {
      /* video may be unavailable in some environments */
    }
  }
  await browser.close();
  killApp(appProc);

  const summary = summarize(results);

  // Self-grading is the central weakness — make it loud when no claim was
  // authored independently of the work.
  if (judging && results.length > 0 && independent === 0) {
    runNotes.push(
      "All acceptance claims were authored by the agent that did the work (self-graded). " +
        "Author them from the issue/ticket and pass `--contract` for independent verification."
    );
  }

  // Trace-on-failure-only: a passing run doesn't need the (large) trace; keep it
  // only when there's something to debug.
  let tracePath = existsSync(join(outDir, traceRel)) ? traceRel : null;
  if (tracePath && summary.fail === 0 && summary.inconclusive === 0) {
    try {
      unlinkSync(join(outDir, traceRel));
      tracePath = null;
      runNotes.push("trace.zip pruned (all claims passed; the trace is kept only on failure).");
    } catch {
      /* keep it if we can't remove it */
    }
  }

  const out: QaResults = {
    schemaVersion: "1",
    startedAt: startedAt.toISOString(),
    durationMs: Date.now() - startedAt.getTime(),
    videoPath: videoRel,
    tracePath,
    reasoningOnly: false,
    results,
    summary,
    notes: runNotes.length ? runNotes : undefined,
  };
  writeFileSync(join(outDir, "qa-results.json"), JSON.stringify(out, null, 2));
  log.ok(
    `qa complete → ${outDir}  (pass:${summary.pass} fail:${summary.fail} ` +
      `inconclusive:${summary.inconclusive} not_tested:${summary.not_tested})`
  );
  for (const n of runNotes) log.warn(n);
  return exitCodeFor(summary);
}
