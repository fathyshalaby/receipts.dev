// Data contracts — the spine of the product (PRD §8).
// These types are the single source of truth shared by qa, build and report.

export type Viewport = "desktop" | "mobile" | "tablet" | null;
export type Verdict = "pass" | "fail" | "inconclusive" | "not_tested";
export type Judge = "llm" | "none";

/** Optional deterministic navigation step (v0 extension — see references/schemas.md). */
export interface QaStep {
  /** Playwright-ish action. */
  action: "goto" | "click" | "fill" | "press" | "wait" | "hover" | "select";
  /** CSS / text selector for click|fill|hover|select. */
  selector?: string;
  /** Value for fill|press|select, path/url for goto, ms for wait. */
  value?: string | number;
}

export interface AcceptanceCriterion {
  id: string;
  /** Observable, falsifiable, provable from pixels. */
  claim: string;
  /** Plain-language route to the state (recorded + shown; used by future LLM-driven nav). */
  navigationHint?: string | null;
  viewport?: Viewport;
  /** Optional path/url to load for this claim instead of targetUrl root. */
  path?: string | null;
  /** Optional deterministic steps run before the "after" screenshot. */
  steps?: QaStep[];
}

export interface PromptLogEntry {
  role: "user" | "assistant";
  text: string;
  ts?: string | null;
}

export interface FileChanged {
  path: string;
  additions: number;
  deletions: number;
  area?: string | null;
}

/** receipt-input.json — written by the agent (the intent/reasoning side). */
export interface ReceiptInput {
  schemaVersion: "1";
  task: string;
  branch: string;
  prNumber: number | null;
  targetUrl: string;
  startCommand: string | null;
  acceptanceCriteria: AcceptanceCriterion[];
  plan: string;
  decisions: string[];
  rejectedAlternatives: string[];
  promptLog: PromptLogEntry[];
  filesChanged: FileChanged[];
}

export interface QaResult {
  acId: string;
  claim: string;
  verdict: Verdict;
  judge: Judge;
  rationale: string | null;
  screenshots: {
    before: string | null;
    after: string;
  };
}

export interface QaSummary {
  pass: number;
  fail: number;
  inconclusive: number;
  not_tested: number;
}

/** qa-results.json — emitted by `receipts qa`. */
export interface QaResults {
  schemaVersion: "1";
  startedAt: string;
  durationMs: number;
  videoPath: string | null;
  tracePath: string | null;
  /** True when no visual QA ran (no acceptance criteria / no target URL). */
  reasoningOnly: boolean;
  results: QaResult[];
  summary: QaSummary;
}

export type OverallVerdict = "pass" | "fail" | "reasoning-only" | "visual-only";

/** manifest.json — merged index the HTML renders from (PRD §8.3). */
export interface Manifest {
  schemaVersion: "1";
  generatorVersion: string;
  generatedAt: string;
  overallVerdict: OverallVerdict;
  repo: string | null;
  commit: string | null;
  input: ReceiptInput;
  qa: QaResults;
}
