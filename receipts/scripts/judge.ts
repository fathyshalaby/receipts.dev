import { readFileSync } from "node:fs";
import { extname } from "node:path";
import type { AcceptanceCriterion, Verdict } from "./types";
import { log } from "./util";

const DEFAULT_MODEL = "claude-sonnet-4-6";
const API_URL = "https://api.anthropic.com/v1/messages";
// Cap images per request so a long interaction can't blow up the payload.
const MAX_JUDGE_FRAMES = 8;

export interface JudgeVerdict {
  verdict: Verdict;
  rationale: string;
}

export interface Refutation {
  refuted: boolean;
  rationale: string;
}

export function judgeEnabled(noJudge: boolean): boolean {
  if (noJudge) return false;
  if (!process.env.RECEIPTS_API_KEY) {
    log.warn(
      "RECEIPTS_API_KEY not set — running in visual-only mode (verdicts = not_tested). " +
        "Set RECEIPTS_API_KEY to enable LLM-judged verdicts, or pass --no-judge to silence this."
    );
    return false;
  }
  return true;
}

/**
 * Reconcile the primary verdict with an adversarial refutation. Pure &
 * unit-tested. The only move is `pass → inconclusive` when the adversary refutes
 * a claimed pass — a self-authored claim shouldn't wave itself through. A refuted
 * non-pass, or an unrefuted pass, is left untouched (we never invent a `fail`).
 */
export function reconcileVerdict(primary: Verdict, refuted: boolean): Verdict {
  return primary === "pass" && refuted ? "inconclusive" : primary;
}

/** Keep first + last and evenly sample the middle so we never exceed the cap. */
export function sampleFrames(paths: string[], max = MAX_JUDGE_FRAMES): string[] {
  if (paths.length <= max) return paths;
  const out = [paths[0]];
  const innerCount = max - 2;
  const innerStart = 1;
  const innerEnd = paths.length - 2;
  for (let i = 0; i < innerCount; i++) {
    const idx = innerStart + Math.round((i * (innerEnd - innerStart)) / (innerCount - 1 || 1));
    out.push(paths[idx]);
  }
  out.push(paths[paths.length - 1]);
  return out;
}

function mediaType(p: string): string {
  const e = extname(p).toLowerCase();
  if (e === ".jpg" || e === ".jpeg") return "image/jpeg";
  if (e === ".webp") return "image/webp";
  return "image/png";
}

function imageBlock(path: string) {
  return {
    type: "image",
    source: {
      type: "base64",
      media_type: mediaType(path),
      data: readFileSync(path).toString("base64"),
    },
  };
}

/** Describe the frame sequence for the model (1 image vs an ordered trajectory). */
function framing(n: number): string {
  if (n <= 1) return `You are given one screenshot of the running app (the final state).`;
  return (
    `You are given ${n} screenshots of the running app in chronological order: ` +
    `the FIRST is the initial state, the LAST is the final state` +
    (n > 2 ? `, and the ones between show the interaction as it happened.` : `.`)
  );
}

async function callModel(content: any[]): Promise<string | { error: string }> {
  const apiKey = process.env.RECEIPTS_API_KEY!;
  const model = process.env.RECEIPTS_MODEL || DEFAULT_MODEL;
  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model, max_tokens: 400, messages: [{ role: "user", content }] }),
    });
  } catch (e: any) {
    return { error: `request failed: ${e?.message ?? e}` };
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { error: `API error ${res.status}: ${body.slice(0, 200)}` };
  }
  const data: any = await res.json();
  return data?.content?.map((b: any) => (b.type === "text" ? b.text : "")).join("") ?? "";
}

/**
 * Vision-LLM verdict for one claim, judged from the chronological frame sequence
 * (before → per-step → after). Anthropic Messages API via plain fetch (no SDK).
 */
export async function judgeClaim(
  criterion: AcceptanceCriterion,
  framePaths: string[]
): Promise<JudgeVerdict> {
  const frames = sampleFrames(framePaths.filter(Boolean));
  const content: any[] = [
    {
      type: "text",
      text:
        `You are a strict visual-QA judge for a coding agent's pull request.\n\n` +
        `CLAIM TO VERIFY: "${criterion.claim}"\n` +
        (criterion.navigationHint
          ? `Context (how the state was reached): ${criterion.navigationHint}\n`
          : "") +
        `\n${framing(frames.length)}\n\n` +
        `Decide a verdict strictly from what is visible in the pixels:\n` +
        `- "pass": the claim is clearly demonstrated.\n` +
        `- "fail": the claim is clearly contradicted.\n` +
        `- "inconclusive": the screenshots do not show enough to decide.\n\n` +
        `Respond with ONLY a JSON object, no prose, no markdown fence:\n` +
        `{"verdict":"pass|fail|inconclusive","rationale":"one or two sentences citing what you saw"}`,
    },
    ...frames.map(imageBlock),
  ];

  const out = await callModel(content);
  if (typeof out !== "string") {
    return { verdict: "inconclusive", rationale: `Judge ${out.error}` };
  }
  const parsed = extractJson(out);
  if (!parsed || !parsed.verdict || !["pass", "fail", "inconclusive"].includes(parsed.verdict)) {
    return { verdict: "inconclusive", rationale: `Could not parse judge output: ${out.slice(0, 200)}` };
  }
  return { verdict: parsed.verdict as Verdict, rationale: String(parsed.rationale ?? "") };
}

/**
 * Adversarial second look. Prompted to *refute* a claimed pass — the cashier
 * doesn't let you write your own receipt. Only the caller decides what to do with
 * a refutation (see reconcileVerdict); on any error we report "not refuted" so a
 * flaky adversary can't manufacture failures.
 */
export async function refuteClaim(
  criterion: AcceptanceCriterion,
  framePaths: string[]
): Promise<Refutation> {
  const frames = sampleFrames(framePaths.filter(Boolean));
  const content: any[] = [
    {
      type: "text",
      text:
        `You are a SKEPTICAL adversarial QA reviewer. A coding agent claims its own ` +
        `work satisfies the following — assume it may be cherry-picked, only partly ` +
        `done, or staged on the wrong screen.\n\n` +
        `CLAIM: "${criterion.claim}"\n` +
        (criterion.navigationHint ? `Context: ${criterion.navigationHint}\n` : "") +
        `\n${framing(frames.length)}\n\n` +
        `Find concrete visual evidence that the claim is NOT genuinely satisfied ` +
        `(missing or wrong element, wrong text, an error/empty/partial state, or a ` +
        `different view than the claim implies). Only refute when the pixels actually ` +
        `support it — do not invent problems.\n\n` +
        `Respond with ONLY JSON, no prose:\n` +
        `{"refuted":true|false,"rationale":"what you saw, one or two sentences"}`,
    },
    ...frames.map(imageBlock),
  ];

  const out = await callModel(content);
  if (typeof out !== "string") return { refuted: false, rationale: `Adversarial check ${out.error}` };
  const parsed = extractJson(out);
  if (!parsed || typeof parsed.refuted !== "boolean") {
    return { refuted: false, rationale: `Could not parse adversarial output: ${out.slice(0, 160)}` };
  }
  return { refuted: parsed.refuted, rationale: String(parsed.rationale ?? "") };
}

function extractJson(text: string): { verdict?: string; rationale?: string; refuted?: boolean } | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}
