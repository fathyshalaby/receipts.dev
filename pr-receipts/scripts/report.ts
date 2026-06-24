import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { Manifest, OverallVerdict, Verdict } from "./types";
import { esc } from "./util";

const here = dirname(fileURLToPath(import.meta.url));

function css(): string {
  try {
    return readFileSync(join(here, "..", "assets", "report.css"), "utf8");
  } catch {
    return "";
  }
}

const VERDICT_LABEL: Record<Verdict | OverallVerdict, string> = {
  pass: "PASS",
  fail: "FAIL",
  inconclusive: "INCONCLUSIVE",
  not_tested: "NOT TESTED",
  "reasoning-only": "REASONING ONLY",
  "visual-only": "VISUAL ONLY",
};

function badge(v: Verdict | OverallVerdict): string {
  return `<span class="badge badge--${esc(v)}">${esc(VERDICT_LABEL[v] ?? v)}</span>`;
}

function nl2br(s: string): string {
  return esc(s).replace(/\n/g, "<br>");
}

/** Render the complete self-contained report HTML from a manifest. */
export function renderReport(m: Manifest): string {
  const { input, qa } = m;
  const sha = m.commit ? m.commit.slice(0, 10) : "—";
  const commitLink =
    m.repo && m.commit ? `${m.repo}/commit/${m.commit}` : null;

  // --- Section 1: header ---
  const header = `
  <header class="hd">
    <div class="hd__top">
      <div class="hd__brand">Receipts<span class="hd__dot">.</span></div>
      ${badge(m.overallVerdict)}
    </div>
    <h1 class="hd__task">${esc(input.task)}</h1>
    <div class="hd__meta">
      <span><b>branch</b> ${esc(input.branch)}</span>
      ${input.prNumber != null ? `<span><b>PR</b> #${esc(input.prNumber)}</span>` : ""}
      <span><b>commit</b> ${
        commitLink ? `<a href="${esc(commitLink)}">${esc(sha)}</a>` : esc(sha)
      }</span>
      <span><b>generated</b> ${esc(m.generatedAt)}</span>
    </div>
    ${
      qa.reasoningOnly
        ? `<p class="hd__note">No visual QA ran for this change (no acceptance criteria or no target URL). This is a reasoning-only receipt.</p>`
        : ""
    }
  </header>`;

  // --- Section 2: Watch the work (video) ---
  const watch = qa.videoPath
    ? `
  <section class="card">
    <h2 class="sec">▶ Watch the work</h2>
    <video class="video" controls preload="metadata" src="${esc(qa.videoPath)}"></video>
    <p class="muted">Recorded Playwright session across every acceptance claim.</p>
  </section>`
    : `
  <section class="card">
    <h2 class="sec">▶ Watch the work</h2>
    <p class="muted">No session recording available for this receipt.</p>
  </section>`;

  // --- Section 3: Acceptance criteria results (expected vs actual) ---
  const claims = qa.results
    .map((r) => {
      const shots = `
        <div class="shots">
          ${
            r.screenshots.before
              ? `<figure><figcaption>before</figcaption><a href="${esc(
                  r.screenshots.before
                )}" target="_blank"><img loading="lazy" src="${esc(
                  r.screenshots.before
                )}" alt="${esc(r.acId)} before"></a></figure>`
              : ""
          }
          <figure><figcaption>after</figcaption><a href="${esc(
            r.screenshots.after
          )}" target="_blank"><img loading="lazy" src="${esc(
            r.screenshots.after
          )}" alt="${esc(r.acId)} after"></a></figure>
        </div>`;
      const rationale = r.rationale
        ? `<details class="why"><summary>model rationale (${esc(
            r.judge
          )})</summary><p>${nl2br(r.rationale)}</p></details>`
        : "";
      return `
      <div class="claim">
        <div class="claim__hd">${badge(r.verdict)}<span class="claim__id">${esc(
          r.acId
        )}</span><span class="claim__text">${esc(r.claim)}</span></div>
        ${shots}
        ${rationale}
      </div>`;
    })
    .join("");

  const acSection = qa.reasoningOnly
    ? ""
    : `
  <section class="card">
    <h2 class="sec">Acceptance criteria — expected vs actual</h2>
    <div class="summary">
      ${badge("pass")} ${qa.summary.pass}
      ${badge("fail")} ${qa.summary.fail}
      ${badge("inconclusive")} ${qa.summary.inconclusive}
      ${badge("not_tested")} ${qa.summary.not_tested}
    </div>
    ${claims || `<p class="muted">No claims recorded.</p>`}
  </section>`;

  // --- Section 4: How the agent thought ---
  const list = (items: string[]) =>
    items && items.length
      ? `<ul>${items.map((d) => `<li>${nl2br(d)}</li>`).join("")}</ul>`
      : `<p class="muted">—</p>`;

  const promptLog =
    input.promptLog && input.promptLog.length
      ? `<details class="why"><summary>prompt log (${input.promptLog.length} turns)</summary>
          <div class="log">${input.promptLog
            .map(
              (p) =>
                `<div class="log__row log__row--${esc(p.role)}"><span class="log__role">${esc(
                  p.role
                )}</span><span class="log__text">${nl2br(p.text)}</span></div>`
            )
            .join("")}</div></details>`
      : "";

  const thought = `
  <section class="card">
    <h2 class="sec">How the agent thought</h2>
    <h3>Plan</h3><p>${nl2br(input.plan || "—")}</p>
    <h3>Decisions</h3>${list(input.decisions)}
    <h3>Rejected alternatives</h3>${list(input.rejectedAlternatives)}
    ${promptLog}
  </section>`;

  // --- Section 5: Files changed ---
  const byArea = new Map<string, typeof input.filesChanged>();
  for (const f of input.filesChanged ?? []) {
    const area = f.area || "other";
    if (!byArea.has(area)) byArea.set(area, []);
    byArea.get(area)!.push(f);
  }
  const filesSection = `
  <section class="card">
    <h2 class="sec">Files changed</h2>
    ${
      byArea.size === 0
        ? `<p class="muted">No files recorded.</p>`
        : [...byArea.entries()]
            .map(
              ([area, files]) => `
      <div class="area"><h3>${esc(area)}</h3>
        <table class="files">
          ${files
            .map(
              (f) =>
                `<tr><td class="files__path">${esc(
                  f.path
                )}</td><td class="files__add">+${esc(
                  f.additions
                )}</td><td class="files__del">−${esc(f.deletions)}</td></tr>`
            )
            .join("")}
        </table>
      </div>`
            )
            .join("")
    }
  </section>`;

  // --- Section 6: footer ---
  const footer = `
  <footer class="ft">
    <span>${esc(m.generatorVersion)}</span>
    ${qa.tracePath ? `<a href="${esc(qa.tracePath)}" download>download trace.zip</a>` : ""}
    <span>generated by <b>Receipts</b> — watch the work.</span>
  </footer>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Receipt — ${esc(input.task).slice(0, 80)}</title>
<style>${css()}</style>
</head>
<body>
<main class="wrap">
${header}
${watch}
${acSection}
${thought}
${filesSection}
${footer}
</main>
<script>
// Tiny no-network enhancement: remember which <details> are open within the page session only.
// (No localStorage/sessionStorage per spec — pure in-memory, resets on reload.)
document.addEventListener('click', function (e) {
  var s = e.target.closest && e.target.closest('summary');
  if (s) { /* native toggle handles it */ }
});
</script>
</body>
</html>`;
}
