import { readFileSync } from "node:fs";
import { extname } from "node:path";
import type { AcceptanceCriterion, Verdict } from "./types";
import { log } from "./util";

const DEFAULT_MODEL = "claude-sonnet-4-6";
const API_URL = "https://api.anthropic.com/v1/messages";

export interface JudgeVerdict {
  verdict: Verdict;
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

/**
 * Vision-LLM verdict for one claim, judged from before/after screenshots.
 * Anthropic Messages API via plain fetch (no SDK dependency).
 */
export async function judgeClaim(
  criterion: AcceptanceCriterion,
  beforePath: string | null,
  afterPath: string
): Promise<JudgeVerdict> {
  const apiKey = process.env.RECEIPTS_API_KEY!;
  const model = process.env.RECEIPTS_MODEL || DEFAULT_MODEL;

  const content: any[] = [
    {
      type: "text",
      text:
        `You are a strict visual-QA judge for a coding agent's pull request.\n\n` +
        `CLAIM TO VERIFY: "${criterion.claim}"\n` +
        (criterion.navigationHint
          ? `Context (how the state was reached): ${criterion.navigationHint}\n`
          : "") +
        `\nYou are given screenshots of the running app.` +
        (beforePath ? ` The FIRST image is "before", the SECOND is "after".` : "") +
        `\n\nDecide a verdict strictly from what is visible in the pixels:\n` +
        `- "pass": the claim is clearly demonstrated.\n` +
        `- "fail": the claim is clearly contradicted.\n` +
        `- "inconclusive": the screenshots do not show enough to decide.\n\n` +
        `Respond with ONLY a JSON object, no prose, no markdown fence:\n` +
        `{"verdict":"pass|fail|inconclusive","rationale":"one or two sentences citing what you saw"}`,
    },
  ];
  if (beforePath) content.push(imageBlock(beforePath));
  content.push(imageBlock(afterPath));

  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 400,
        messages: [{ role: "user", content }],
      }),
    });
  } catch (e: any) {
    return { verdict: "inconclusive", rationale: `Judge request failed: ${e?.message ?? e}` };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return {
      verdict: "inconclusive",
      rationale: `Judge API error ${res.status}: ${body.slice(0, 200)}`,
    };
  }

  const data: any = await res.json();
  const text: string =
    data?.content?.map((b: any) => (b.type === "text" ? b.text : "")).join("") ?? "";

  const parsed = extractJson(text);
  if (!parsed || !parsed.verdict || !["pass", "fail", "inconclusive"].includes(parsed.verdict)) {
    return {
      verdict: "inconclusive",
      rationale: `Could not parse judge output: ${text.slice(0, 200)}`,
    };
  }
  return { verdict: parsed.verdict as Verdict, rationale: String(parsed.rationale ?? "") };
}

function extractJson(text: string): { verdict?: string; rationale?: string } | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}
