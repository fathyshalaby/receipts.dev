// Shared types mirroring the public.receipts row and the receipt manifest shape.
// This app only ever READS receipts — never writes.

export type OverallVerdict = "pass" | "fail" | "reasoning-only" | "visual-only";

export type Visibility = "unlisted" | "public" | "private";

export type QaResultVerdict =
  | "pass"
  | "fail"
  | "inconclusive"
  | "not_tested"
  | string;

/** summary jsonb counts */
export interface ReceiptSummary {
  pass: number;
  fail: number;
  inconclusive: number;
  not_tested: number;
}

/** One acceptance-criteria check from manifest.qa.results[] */
export interface QaResult {
  claim?: string;
  verdict?: QaResultVerdict;
  rationale?: string;
  [key: string]: unknown;
}

export interface ManifestQa {
  summary?: ReceiptSummary;
  results?: QaResult[];
  reasoningOnly?: boolean;
  videoPath?: string;
  [key: string]: unknown;
}

export interface ManifestInput {
  task?: string;
  branch?: string;
  prNumber?: number | null;
  plan?: string;
  decisions?: string[];
  rejectedAlternatives?: string[];
  acceptanceCriteria?: string[];
  filesChanged?: string[];
  [key: string]: unknown;
}

/** The full receipt manifest (mirrors manifest.json) */
export interface Manifest {
  schemaVersion?: string;
  generatorVersion?: string;
  generatedAt?: string;
  overallVerdict?: OverallVerdict;
  repo?: string;
  commit?: string;
  input?: ManifestInput;
  qa?: ManifestQa;
  [key: string]: unknown;
}

/** A row from public.receipts */
export interface Receipt {
  id: string;
  slug: string | null;
  owner_id: string | null;
  repo: string | null;
  commit: string | null;
  branch: string | null;
  pr_number: number | null;
  task: string | null;
  overall_verdict: OverallVerdict | null;
  summary: ReceiptSummary | null;
  manifest: Manifest | null;
  storage_prefix: string | null;
  report_path: string | null;
  video_path: string | null;
  report_url: string | null;
  video_url: string | null;
  visibility: Visibility | null;
  created_at: string;
}
