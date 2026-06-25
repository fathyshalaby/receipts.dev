import type { ReceiptSummary } from "@/lib/types";

const ORDER: [keyof ReceiptSummary, string, string][] = [
  ["pass", "dot--pass", "pass"],
  ["fail", "dot--fail", "fail"],
  ["inconclusive", "dot--inconclusive", "inconclusive"],
  ["not_tested", "dot--not_tested", "not tested"],
];

export function SummaryCounts({
  summary,
}: {
  summary: ReceiptSummary | null | undefined;
}) {
  if (!summary) return null;
  return (
    <div className="counts">
      {ORDER.map(([key, dot, label]) => (
        <span className="count" key={key} title={label}>
          <span className={`dot ${dot}`} />
          <b>{summary[key] ?? 0}</b>
        </span>
      ))}
    </div>
  );
}
