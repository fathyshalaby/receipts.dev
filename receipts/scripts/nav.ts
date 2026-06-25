import type { QaStep } from "./types";

// LLM-driven navigation (PRD: navigationHint). When a claim has NO deterministic
// `steps` but DOES have a plain-language `navigationHint`, we ask the model to
// turn the hint + a snapshot of the page's interactive elements into a short
// sequence of QaSteps, then run them best-effort before the "after" screenshot.
//
// Deterministic `steps` (author-provided) always win; this is the fallback for
// claims that only described the route in prose. Gated on RECEIPTS_API_KEY.

const DEFAULT_MODEL = "claude-sonnet-4-6";
const API_URL = "https://api.anthropic.com/v1/messages";
const ALLOWED: QaStep["action"][] = ["goto", "click", "fill", "press", "hover", "select", "wait"];
const MAX_STEPS = 12;

export interface NavElement {
  tag: string;
  role?: string;
  text?: string;
  selector: string;
}

export function navEnabled(): boolean {
  return !!process.env.RECEIPTS_API_KEY;
}

/**
 * Validate raw model output into a safe QaStep[]. Pure — unit-testable without a
 * browser or network. Drops anything outside the allowed action vocabulary and
 * caps the count so a hallucinated plan can't loop forever.
 */
export function parseNavSteps(text: string): QaStep[] {
  const arr = extractJsonArray(text);
  if (!Array.isArray(arr)) return [];
  const steps: QaStep[] = [];
  for (const raw of arr) {
    if (!raw || typeof raw !== "object") continue;
    const action = (raw as any).action;
    if (!ALLOWED.includes(action)) continue;
    const step: QaStep = { action };
    if (typeof (raw as any).selector === "string") step.selector = (raw as any).selector;
    const v = (raw as any).value;
    if (typeof v === "string" || typeof v === "number") step.value = v;
    // Actions that need a selector but have none are useless — skip them.
    if (["click", "fill", "hover", "select"].includes(action) && !step.selector) continue;
    if (action === "goto" && step.value === undefined && !step.selector) continue;
    steps.push(step);
    if (steps.length >= MAX_STEPS) break;
  }
  return steps;
}

function extractJsonArray(text: string): unknown {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

export function buildNavPrompt(hint: string, url: string, elements: NavElement[]): string {
  const list = elements
    .map((e, i) => `${i + 1}. <${e.tag}${e.role ? ` role=${e.role}` : ""}> ${JSON.stringify(e.text ?? "")} → selector: ${e.selector}`)
    .join("\n");
  return (
    `You drive a Playwright browser to reach a UI state described in plain language.\n` +
    `Current URL: ${url}\n` +
    `GOAL: ${hint}\n\n` +
    `Interactive elements currently on the page:\n${list || "(none detected)"}\n\n` +
    `Return ONLY a JSON array of steps (no prose, no markdown). Each step is one of:\n` +
    `  {"action":"click","selector":"<css>"}\n` +
    `  {"action":"fill","selector":"<css>","value":"<text>"}\n` +
    `  {"action":"press","value":"Enter"}\n` +
    `  {"action":"hover","selector":"<css>"}\n` +
    `  {"action":"select","selector":"<css>","value":"<option>"}\n` +
    `  {"action":"goto","value":"/path"}\n` +
    `  {"action":"wait","value":500}\n` +
    `Prefer the selectors listed above. Keep it to the few steps needed to reach the goal. ` +
    `If already in the goal state, return [].`
  );
}

/** Snapshot a compact, capped list of interactive elements for the model. */
export async function snapshotInteractives(page: import("playwright").Page): Promise<NavElement[]> {
  return page.evaluate(() => {
    const sel = "a,button,input,textarea,select,[role=button],[role=link],[role=tab]";
    const nodes = Array.from(document.querySelectorAll(sel)).slice(0, 60);
    const cssFor = (el: Element): string => {
      const id = (el as HTMLElement).id;
      if (id) return `#${CSS.escape(id)}`;
      const tn = (el as HTMLElement).getAttribute("data-testid");
      if (tn) return `[data-testid="${tn}"]`;
      const name = (el as HTMLElement).getAttribute("name");
      if (name) return `${el.tagName.toLowerCase()}[name="${name}"]`;
      const cls = (el as HTMLElement).className?.toString().trim().split(/\s+/)[0];
      return cls ? `${el.tagName.toLowerCase()}.${CSS.escape(cls)}` : el.tagName.toLowerCase();
    };
    return nodes.map((el) => ({
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute("role") || undefined,
      text: (el.textContent || (el as HTMLInputElement).placeholder || "").trim().slice(0, 60) || undefined,
      selector: cssFor(el),
    }));
  });
}

async function callModel(prompt: string): Promise<string | null> {
  const apiKey = process.env.RECEIPTS_API_KEY!;
  const model = process.env.RECEIPTS_MODEL || DEFAULT_MODEL;
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 600, messages: [{ role: "user", content: [{ type: "text", text: prompt }] }] }),
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    return data?.content?.map((b: any) => (b.type === "text" ? b.text : "")).join("") ?? null;
  } catch {
    return null;
  }
}

export interface NavOutcome {
  mode: "llm";
  planned: QaStep[];
  ran: number;
  note: string;
}

/**
 * Plan + execute navigation from a hint. Runs steps best-effort: a step that
 * fails (stale selector, etc.) is skipped, not fatal — the "after" screenshot
 * still captures wherever we got to, and the judge decides the verdict.
 */
export async function llmNavigate(page: import("playwright").Page, hint: string): Promise<NavOutcome> {
  const elements = await snapshotInteractives(page);
  const text = await callModel(buildNavPrompt(hint, page.url(), elements));
  if (!text) return { mode: "llm", planned: [], ran: 0, note: "LLM navigation unavailable (model error)." };

  const planned = parseNavSteps(text);
  let ran = 0;
  for (const step of planned) {
    try {
      await runOne(page, step);
      ran++;
    } catch {
      // best-effort: skip and continue
    }
  }
  const note =
    planned.length === 0
      ? "Model judged the page already in the target state (no steps)."
      : `AI navigation ran ${ran}/${planned.length} step(s) from the hint.`;
  return { mode: "llm", planned, ran, note };
}

async function runOne(page: import("playwright").Page, step: QaStep): Promise<void> {
  switch (step.action) {
    case "goto":
      await page.goto(String(step.value ?? step.selector), { waitUntil: "domcontentloaded" });
      break;
    case "click":
      await page.click(step.selector!, { timeout: 5000 });
      break;
    case "fill":
      await page.fill(step.selector!, String(step.value ?? ""), { timeout: 5000 });
      break;
    case "press":
      await page.keyboard.press(String(step.value ?? "Enter"));
      break;
    case "hover":
      await page.hover(step.selector!, { timeout: 5000 });
      break;
    case "select":
      await page.selectOption(step.selector!, String(step.value ?? ""), { timeout: 5000 });
      break;
    case "wait":
      await page.waitForTimeout(Number(step.value ?? 500));
      break;
  }
}
