import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/SiteHeader";
import { VerdictBadge } from "@/components/VerdictBadge";
import { SummaryCounts } from "@/components/SummaryCounts";
import { verdictClass, verdictLabel, absoluteTime } from "@/lib/format";
import type { Receipt } from "@/lib/types";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function ReceiptDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // RLS enforces access — a forbidden/non-existent row returns null.
  const { data } = await supabase
    .from("receipts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();

  const receipt = data as Receipt;
  const manifest = receipt.manifest ?? {};
  const input = manifest.input ?? {};
  const results = manifest.qa?.results ?? [];
  const task = receipt.task || input.task || "Untitled task";

  return (
    <>
      <SiteHeader email={user.email} />
      <main className="container">
        <div className="detail-head">
          <Link href="/gallery" className="back-link">
            ← All receipts
          </Link>
          <VerdictBadge verdict={receipt.overall_verdict} />
          <h1>{task}</h1>

          <div className="detail-actions">
            {receipt.video_url && (
              <a
                className="btn btn--accent"
                href={receipt.video_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                ▶ Watch video ↗
              </a>
            )}
            {receipt.report_url && (
              <a
                className="btn btn--primary"
                href={receipt.report_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open full report ↗
              </a>
            )}
          </div>
        </div>

        <div className="layout">
          {/* Left column: facts + criteria + plan */}
          <div>
            <section className="panel">
              <h2>Overview</h2>
              <dl className="kv">
                <dt>Repo</dt>
                <dd className="mono">{receipt.repo ?? "—"}</dd>
                <dt>Branch</dt>
                <dd className="mono">{receipt.branch ?? "—"}</dd>
                <dt>PR</dt>
                <dd>
                  {receipt.pr_number != null ? `#${receipt.pr_number}` : "—"}
                </dd>
                <dt>Commit</dt>
                <dd className="mono">{receipt.commit ?? "—"}</dd>
                <dt>Verdict</dt>
                <dd>
                  <span className={`badge ${verdictClass(receipt.overall_verdict)}`}>
                    {verdictLabel(receipt.overall_verdict)}
                  </span>
                </dd>
                <dt>Created</dt>
                <dd>{absoluteTime(receipt.created_at)}</dd>
              </dl>

              <h3>Summary</h3>
              <SummaryCounts summary={receipt.summary ?? manifest.qa?.summary} />
            </section>

            <section className="panel">
              <h2>Acceptance criteria</h2>
              {results.length === 0 ? (
                <p className="muted-text">No criteria recorded.</p>
              ) : (
                <div className="criteria">
                  {results.map((r, i) => (
                    <div className="criterion" key={i}>
                      <div className="criterion__head">
                        <span className="criterion__claim">
                          {r.claim ?? `Criterion ${i + 1}`}
                        </span>
                        <span className={`badge ${verdictClass(r.verdict)}`}>
                          {verdictLabel(r.verdict)}
                        </span>
                      </div>
                      {r.rationale && (
                        <p className="criterion__rationale">{r.rationale}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {(input.plan ||
              (input.decisions && input.decisions.length > 0) ||
              (input.rejectedAlternatives &&
                input.rejectedAlternatives.length > 0)) && (
              <section className="panel">
                <h2>Plan &amp; decisions</h2>

                {input.plan && (
                  <>
                    <h3>Plan</h3>
                    <p className="prose">{input.plan}</p>
                  </>
                )}

                {input.decisions && input.decisions.length > 0 && (
                  <>
                    <h3>Decisions</h3>
                    <ul className="list">
                      {input.decisions.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </>
                )}

                {input.rejectedAlternatives &&
                  input.rejectedAlternatives.length > 0 && (
                    <>
                      <h3>Rejected alternatives</h3>
                      <ul className="list">
                        {input.rejectedAlternatives.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    </>
                  )}
              </section>
            )}

            {input.filesChanged && input.filesChanged.length > 0 && (
              <section className="panel">
                <h2>Files changed</h2>
                <div className="file-list">
                  {input.filesChanged.map((f, i) => (
                    <code key={i}>
                      {f.path}{" "}
                      <span className="muted-text">
                        +{f.additions}/−{f.deletions}
                      </span>
                    </code>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right column: embedded report */}
          <div>
            {receipt.report_url ? (
              <div className="report-frame-wrap">
                <iframe
                  className="report-frame"
                  src={receipt.report_url}
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  referrerPolicy="no-referrer"
                  title="Receipt report"
                />
              </div>
            ) : (
              <section className="panel">
                <p className="muted-text">No hosted report available.</p>
              </section>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
