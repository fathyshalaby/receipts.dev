import Link from "next/link";
import { VerdictBadge } from "./VerdictBadge";
import { SummaryCounts } from "./SummaryCounts";
import { relativeTime, absoluteTime } from "@/lib/format";
import type { Receipt } from "@/lib/types";

const VISIBILITY_ICONS: Record<string, string> = {
  private: "🔒",
  unlisted: "🔗",
  public: "🌐",
};

export function ReceiptCard({ receipt }: { receipt: Receipt }) {
  const task = receipt.task || receipt.manifest?.input?.task || "Untitled task";
  const visibility = receipt.visibility || "unlisted";

  return (
    <article className="card">
      <div className="card__top">
        <h3 className="card__task">
          <Link href={`/r/${receipt.id}`}>{task}</Link>
        </h3>
        <div className="card__badges">
          <VerdictBadge verdict={receipt.overall_verdict} />
          <span className="chip" title={`${visibility} receipt`}>
            {VISIBILITY_ICONS[visibility]}
          </span>
        </div>
      </div>

      <div className="meta">
        {receipt.repo && (
          <span className="chip mono">{receipt.repo}</span>
        )}
        {receipt.branch && <span className="chip mono">{receipt.branch}</span>}
        {receipt.pr_number != null && (
          <span className="chip">PR #{receipt.pr_number}</span>
        )}
      </div>

      <SummaryCounts summary={receipt.summary} />

      <div className="card__footer">
        <time className="time" dateTime={receipt.created_at} title={absoluteTime(receipt.created_at)}>
          {relativeTime(receipt.created_at)}
        </time>
        <div className="card__links">
          {receipt.report_url && (
            <a
              className="btn btn--sm"
              href={receipt.report_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open report ↗
            </a>
          )}
          {receipt.video_url && (
            <a
              className="btn btn--sm btn--accent"
              href={receipt.video_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Video ↗
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
