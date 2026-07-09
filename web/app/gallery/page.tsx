import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/SiteHeader";
import { FilterBar } from "@/components/FilterBar";
import { ReceiptCard } from "@/components/ReceiptCard";
import type { Receipt } from "@/lib/types";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ repo?: string; verdict?: string; visibility?: string }>;

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { repo, verdict, visibility } = await searchParams;

  let query = supabase
    .from("receipts")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (repo) query = query.eq("repo", repo);
  if (verdict) query = query.eq("overall_verdict", verdict);
  if (visibility) query = query.eq("visibility", visibility);

  const { data, error } = await query;
  const receipts = (data ?? []) as Receipt[];

  // Build the distinct repo list for the filter from this user's receipts.
  const { data: allForRepos } = await supabase
    .from("receipts")
    .select("repo")
    .eq("owner_id", user.id);

  const repos = Array.from(
    new Set(
      (allForRepos ?? [])
        .map((r) => (r as { repo: string | null }).repo)
        .filter((r): r is string => Boolean(r))
    )
  ).sort();

  const hasFilter = Boolean(repo || verdict);

  return (
    <>
      <SiteHeader email={user.email} />
      <main className="container">
        <div className="page-head">
          <div>
            <h1>Receipts</h1>
            <p className="muted">
              {receipts.length} receipt{receipts.length === 1 ? "" : "s"}
              {hasFilter ? " matching your filters" : ""}
            </p>
          </div>
          <FilterBar repos={repos} showVisibility />
        </div>

        {error ? (
          <div className="notice notice--err">
            Failed to load receipts: {error.message}
          </div>
        ) : receipts.length === 0 ? (
          <div className="empty">
            <h2>{hasFilter ? "No matching receipts" : "No receipts yet"}</h2>
            <p>
              {hasFilter
                ? "Try clearing the filters above."
                : "Run `receipts publish` in hosted mode to send your first receipt here."}
            </p>
          </div>
        ) : (
          <div className="grid">
            {receipts.map((r) => (
              <ReceiptCard key={r.id} receipt={r} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
