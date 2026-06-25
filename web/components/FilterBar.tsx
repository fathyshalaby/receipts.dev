"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const VERDICTS = ["pass", "fail", "visual-only", "reasoning-only"] as const;

const VERDICT_LABELS: Record<string, string> = {
  pass: "Pass",
  fail: "Fail",
  "visual-only": "Visual only",
  "reasoning-only": "Reasoning only",
};

export function FilterBar({ repos }: { repos: string[] }) {
  const router = useRouter();
  const params = useSearchParams();

  const repo = params.get("repo") ?? "";
  const verdict = params.get("verdict") ?? "";

  const update = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      const qs = next.toString();
      router.push(qs ? `/?${qs}` : "/");
    },
    [params, router]
  );

  return (
    <div className="filter-bar">
      <div className="field">
        <label className="label" htmlFor="filter-repo">
          Repo
        </label>
        <select
          id="filter-repo"
          className="select"
          value={repo}
          onChange={(e) => update("repo", e.target.value)}
        >
          <option value="">All repos</option>
          {repos.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="label" htmlFor="filter-verdict">
          Verdict
        </label>
        <select
          id="filter-verdict"
          className="select"
          value={verdict}
          onChange={(e) => update("verdict", e.target.value)}
        >
          <option value="">All verdicts</option>
          {VERDICTS.map((v) => (
            <option key={v} value={v}>
              {VERDICT_LABELS[v]}
            </option>
          ))}
        </select>
      </div>

      {(repo || verdict) && (
        <button
          className="btn btn--ghost btn--sm"
          onClick={() => router.push("/")}
          type="button"
        >
          Clear
        </button>
      )}
    </div>
  );
}
