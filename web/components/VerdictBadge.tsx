import { verdictClass, verdictLabel } from "@/lib/format";
import type { OverallVerdict } from "@/lib/types";

export function VerdictBadge({
  verdict,
}: {
  verdict: OverallVerdict | string | null | undefined;
}) {
  return (
    <span className={`badge ${verdictClass(verdict)}`}>
      {verdictLabel(verdict)}
    </span>
  );
}
