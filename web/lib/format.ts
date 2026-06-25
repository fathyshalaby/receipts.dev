import type { OverallVerdict } from "./types";

const VERDICT_LABELS: Record<string, string> = {
  pass: "Pass",
  fail: "Fail",
  "visual-only": "Visual only",
  "reasoning-only": "Reasoning only",
};

export function verdictLabel(v: string | null | undefined): string {
  if (!v) return "Unknown";
  return VERDICT_LABELS[v] ?? v;
}

export function verdictClass(v: OverallVerdict | string | null | undefined): string {
  switch (v) {
    case "pass":
    case "fail":
    case "visual-only":
    case "reasoning-only":
      return `badge--${v}`;
    default:
      return "badge--unknown";
  }
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
  ["second", 1],
];

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffSeconds = Math.round((then - Date.now()) / 1000);
  const abs = Math.abs(diffSeconds);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, secs] of UNITS) {
    if (abs >= secs || unit === "second") {
      return rtf.format(Math.round(diffSeconds / secs), unit);
    }
  }
  return "";
}

export function absoluteTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
