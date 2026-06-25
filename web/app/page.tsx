import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import "./landing.css";

const rubik = Rubik({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-rubik",
  display: "swap",
});

const REPO = "https://github.com/fathyshalaby/nuro";
const SKILL = `${REPO}/blob/main/skills/receipts/SKILL.md`;
const SCHEMAS = `${REPO}/blob/main/skills/receipts/references/schemas.md`;
const LICENSE = `${REPO}/blob/main/LICENSE`;
const EXAMPLES = `${REPO}/tree/main/examples`;

export const metadata: Metadata = {
  title: "Receipts — watch the work",
  description:
    "Make your coding agents prove their work. Receipts packages a recorded visual-QA walkthrough + the reasoning behind every PR into one self-contained artefact a human can judge in 90 seconds. Open source, MIT.",
  openGraph: {
    title: "Receipts — watch the work",
    description:
      "Incumbents make AI review the PR. Receipts makes the agent prove its work so a human can judge it.",
    type: "website",
  },
};

function BrandMark({ id }: { id: string }) {
  return (
    <svg className="brand__mark" viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a78bfa" />
          <stop offset="1" stopColor="#f76fa6" />
        </linearGradient>
      </defs>
      <path fill={`url(#${id})`} d="M7 3h18v26l-3-2-3 2-3-2-3 2-3-2-3 2V3z" />
      <g stroke="#150d24" strokeWidth="2" strokeLinecap="round">
        <path d="M11 10h10M11 15h10M11 20h6" />
      </g>
    </svg>
  );
}

export default function LandingPage() {
  return (
    <div className={`lp ${rubik.variable}`} id="top">
      {/* NAV */}
      <header className="nav">
        <div className="wrap nav__in">
          <a className="brand" href="#top" aria-label="Receipts home">
            <BrandMark id="brand-nav" />
            Re<b>ceipts</b>
          </a>
          <nav className="nav__links">
            <a className="lnk" href="#how">
              How it works
            </a>
            <a className="lnk" href="#receipt">
              What&apos;s in a receipt
            </a>
            <a className="lnk" href="#cli">
              CLI
            </a>
            <a className="lnk" href="#start">
              Quickstart
            </a>
            <div className="nav__cta">
              <a className="btn btn--ghost btn--sm" href="/gallery">
                Gallery
              </a>
              <a className="btn btn--primary btn--sm" href="#start">
                Get started
              </a>
            </div>
          </nav>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="hero wrap">
          <span className="eyebrow">
            <span className="dot" /> Open source · MIT · tool-agnostic
          </span>
          <h1 className="hero__h">
            Watch the work, <span className="grad">not just the diff.</span>
          </h1>
          <p className="hero__sub">
            Your coding agents ship PRs faster than anyone can review them.{" "}
            <b>Receipts</b> makes each agent prove its work — a recorded
            visual-QA walkthrough and the reasoning behind the change, packaged
            into one self-contained file a human can judge in 90 seconds.
          </p>
          <div className="hero__cta">
            <a className="btn btn--primary" href="#start">
              Get started — it&apos;s free
            </a>
            <a className="btn btn--ghost" href="#receipt">
              See a receipt ↓
            </a>
          </div>
          <p className="hero__meta">
            npx receipts qa &nbsp;·&nbsp; no accounts &nbsp;·&nbsp; no hosting
            &nbsp;·&nbsp; opens from file://
          </p>

          {/* receipt mockup */}
          <div className="mock-wrap reveal">
            <div className="window">
              <div className="window__bar">
                <span className="tl tl--r" />
                <span className="tl tl--y" />
                <span className="tl tl--g" />
                <span className="window__url">
                  file:///.receipts/pr-128/index.html
                </span>
              </div>
              <div className="window__body">
                <div className="r-head">
                  <div>
                    <div className="r-task">
                      Add an empty-state to the dashboard
                    </div>
                    <div className="r-meta">
                      feat/dashboard-empty-state · PR #128 · 4f2a9c
                    </div>
                  </div>
                  <span className="badge badge--fail">FAIL · 1 OF 3</span>
                </div>
                <div className="r-video">
                  <span className="tag">▶ session.webm — watch the work</span>
                  <span className="play" aria-hidden="true" />
                </div>
                <div className="r-claims">
                  <div className="claim">
                    <span className="badge badge--pass">PASS</span>
                    <span className="claim__t">
                      The empty state with text “No projects yet” is visible
                    </span>
                    <span className="claim__shot" />
                  </div>
                  <div className="claim">
                    <span className="badge badge--pass">PASS</span>
                    <span className="claim__t">
                      A “Create project” button is visible in the empty state
                    </span>
                    <span className="claim__shot" />
                  </div>
                  <div className="claim">
                    <span className="badge badge--fail">FAIL</span>
                    <span className="claim__t">
                      Clicking “Create project” opens the new-project dialog
                    </span>
                    <span className="claim__shot" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PROOF / CONTEXT */}
        <section className="proof wrap">
          <p>Built for the age of parallel agents</p>
          <div className="proof__row">
            <span>
              <b>Claude Code</b>
            </span>
            <span>
              <b>Cursor</b>
            </span>
            <span>
              <b>Codex</b>
            </span>
            <span>
              <b>OpenCode</b>
            </span>
            <span>
              <b>Devin</b>
            </span>
            <span>&amp; any agent on a branch</span>
          </div>
        </section>

        {/* POSITIONING CONTRAST */}
        <section className="section" id="why">
          <div className="wrap center">
            <span className="sec-eyebrow">The shift</span>
            <h2 className="sec-h center">
              Reviewing the thinking isn&apos;t enough. Watch the work.
            </h2>
            <p className="sec-sub center">
              A reviewer opening an agent&apos;s PR gets a diff and maybe a text
              summary — no view of how the agent reasoned, whether it QA&apos;d
              the result, or how the software actually looks. So review is slow,
              or a rubber stamp.
            </p>
          </div>
          <div className="wrap">
            <div className="contrast reveal">
              <div className="contrast__card is-them">
                <div className="contrast__k">The incumbents</div>
                <div className="contrast__h">AI reviews the PR</div>
                <ul>
                  <li>
                    <svg
                      className="ic"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="#9b91b8"
                      strokeWidth="2"
                    >
                      <path d="M5 10h10" />
                    </svg>
                    <span>Comments and severity ratings on the diff</span>
                  </li>
                  <li>
                    <svg
                      className="ic"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="#9b91b8"
                      strokeWidth="2"
                    >
                      <path d="M5 10h10" />
                    </svg>
                    <span>
                      Reasoning with <b>no visual proof</b> the thing works
                    </span>
                  </li>
                  <li>
                    <svg
                      className="ic"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="#9b91b8"
                      strokeWidth="2"
                    >
                      <path d="M5 10h10" />
                    </svg>
                    <span>
                      Replay <b>locked</b> to one agent&apos;s platform
                    </span>
                  </li>
                </ul>
              </div>
              <div className="vs">vs</div>
              <div className="contrast__card is-us">
                <div className="contrast__k">Receipts</div>
                <div className="contrast__h">
                  The agent <span className="grad">proves its work</span>
                </div>
                <ul>
                  <li>
                    <svg
                      className="ic"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="#36d39a"
                      strokeWidth="2.2"
                    >
                      <path d="M4 10.5l4 4 8-9" />
                    </svg>
                    <span>
                      <b>Recorded visual QA</b> against each acceptance claim
                    </span>
                  </li>
                  <li>
                    <svg
                      className="ic"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="#36d39a"
                      strokeWidth="2.2"
                    >
                      <path d="M4 10.5l4 4 8-9" />
                    </svg>
                    <span>
                      <b>Expected vs actual</b> — before/after, with a verdict
                    </span>
                  </li>
                  <li>
                    <svg
                      className="ic"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="#36d39a"
                      strokeWidth="2.2"
                    >
                      <path d="M4 10.5l4 4 8-9" />
                    </svg>
                    <span>
                      One <b>self-hostable</b> artefact, attached to the PR
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="section section--tight" id="how">
          <div className="wrap">
            <span className="sec-eyebrow">How it works</span>
            <h2 className="sec-h">Three steps. No hosting, no accounts.</h2>
            <p className="sec-sub">
              When your agent finishes on a branch, it leaves a receipt. The
              whole flow is a skill the agent runs itself — or three CLI
              commands you run by hand.
            </p>
            <div className="steps reveal">
              <div className="step">
                <div className="step__n">01</div>
                <h3 className="step__h">The agent writes intent</h3>
                <p className="step__p">
                  From its own session: the task, the plan, decisions, rejected
                  alternatives, and falsifiable acceptance claims.
                </p>
                <pre className="code">
                  <span className="c-prompt">#</span> receipt-input.json{"\n"}
                  {"{ "}
                  <span className="c-flag">&quot;claim&quot;</span>:{" "}
                  <span className="c-flag">
                    &quot;empty state is visible&quot;
                  </span>
                  {" }"}
                </pre>
              </div>
              <div className="step">
                <div className="step__n">02</div>
                <h3 className="step__h">Receipts runs the QA</h3>
                <p className="step__p">
                  Boots your app, drives Playwright per claim, records video +
                  trace, captures before/after, and judges each claim with a
                  vision model.
                </p>
                <pre className="code">
                  <span className="c-prompt">$</span>{" "}
                  <span className="c-cmd">receipts</span> qa{" "}
                  <span className="c-flag">--input</span> receipt-input.json
                </pre>
              </div>
              <div className="step">
                <div className="step__n">03</div>
                <h3 className="step__h">It builds the receipt</h3>
                <p className="step__p">
                  Merges everything into one self-contained{" "}
                  <code>index.html</code> — opens from <code>file://</code>, no
                  server, no build step.
                </p>
                <pre className="code">
                  <span className="c-prompt">$</span>{" "}
                  <span className="c-cmd">receipts</span> build{" "}
                  <span className="c-flag">--in</span> .receipts/pr-128{"\n"}
                  <span className="c-ok">✓</span> watch the work
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* WHAT'S IN A RECEIPT */}
        <section className="section" id="receipt">
          <div className="wrap">
            <span className="sec-eyebrow">What&apos;s in a receipt</span>
            <h2 className="sec-h">Everything a reviewer needs, in one file.</h2>
            <div className="grid reveal">
              <div className="feat">
                <div className="feat__ic">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#b7a4fb"
                    strokeWidth="2"
                  >
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="M10 9l5 3-5 3z" fill="#b7a4fb" stroke="none" />
                  </svg>
                </div>
                <h3 className="feat__h">Watch the work</h3>
                <p className="feat__p">
                  The recorded Playwright session, embedded. Lead with the video
                  — it&apos;s the hook. See exactly how the change behaves.
                </p>
              </div>
              <div className="feat">
                <div className="feat__ic">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#b7a4fb"
                    strokeWidth="2"
                  >
                    <rect x="3" y="4" width="8" height="16" rx="1.5" />
                    <rect x="13" y="4" width="8" height="16" rx="1.5" />
                  </svg>
                </div>
                <h3 className="feat__h">Expected vs actual</h3>
                <p className="feat__p">
                  Per claim: before/after screenshots side by side, a pass/fail
                  verdict, and the model&apos;s rationale for it.
                </p>
              </div>
              <div className="feat">
                <div className="feat__ic">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#b7a4fb"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                </div>
                <h3 className="feat__h">How the agent thought</h3>
                <p className="feat__p">
                  The plan, key decisions, the alternatives it rejected and why,
                  plus a collapsible prompt log.
                </p>
              </div>
              <div className="feat">
                <div className="feat__ic">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#b7a4fb"
                    strokeWidth="2"
                  >
                    <path d="M4 6h16M4 12h16M4 18h10" />
                  </svg>
                </div>
                <h3 className="feat__h">Files changed</h3>
                <p className="feat__p">
                  Grouped by area with additions and deletions, so the diff has
                  context, not just lines.
                </p>
              </div>
              <div className="feat">
                <div className="feat__ic">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#b7a4fb"
                    strokeWidth="2"
                  >
                    <path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" />
                  </svg>
                </div>
                <h3 className="feat__h">Self-contained</h3>
                <p className="feat__p">
                  Inline CSS/JS, media co-located, no CDN, no network. A file in
                  your repo or a CI artefact. No buckets, no DB.
                </p>
              </div>
              <div className="feat">
                <div className="feat__ic">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#b7a4fb"
                    strokeWidth="2"
                  >
                    <path d="M4 7l5 5-5 5M13 17h7" />
                  </svg>
                </div>
                <h3 className="feat__h">CI-gateable</h3>
                <p className="feat__p">
                  <code>receipts qa</code> exits non-zero on any failing claim.
                  Backend-only PR? It degrades to a reasoning-only receipt.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CLI / TERMINAL */}
        <section className="section section--tight" id="cli">
          <div className="wrap">
            <div className="term-row">
              <div className="terminal reveal">
                <div className="terminal__bar">
                  <span className="tl tl--r" />
                  <span className="tl tl--y" />
                  <span className="tl tl--g" />
                </div>
                <div className="terminal__body">
                  <div className="line">
                    <span className="p">$</span>{" "}
                    <span className="cmd">npx receipts</span> qa{" "}
                    <span className="f">--input</span> receipt-input.json
                  </div>
                  <div className="out">[receipts] booting app: npm run dev</div>
                  <div className="ok">
                    [receipts] ✓ app is up at http://localhost:3000
                  </div>
                  <div className="out">
                    [receipts] ▶ ac1: empty state is visible &nbsp;
                    <span className="ok">↳ pass</span>
                  </div>
                  <div className="out">
                    [receipts] ▶ ac2: create button is visible &nbsp;
                    <span className="ok">↳ pass</span>
                  </div>
                  <div className="out">
                    [receipts] ▶ ac3: dialog opens on click &nbsp;
                    <span className="warn">↳ fail</span>
                  </div>
                  <div className="ok">
                    [receipts] ✓ qa complete (pass:2 fail:1)
                  </div>
                  <div className="line">
                    <span className="p">$</span>{" "}
                    <span className="cmd">npx receipts</span> build{" "}
                    <span className="f">--in</span> .receipts/pr-128
                  </div>
                  <div className="ok">
                    [receipts] ✓ built receipt → index.html (overall: fail)
                  </div>
                </div>
              </div>
              <div className="term-copy">
                <span className="sec-eyebrow">The CLI</span>
                <h2 className="sec-h">
                  Tool-agnostic. Runs anywhere your app runs.
                </h2>
                <p className="sec-sub">
                  TypeScript + Playwright, no build step. Pin Chromium, record
                  once, judge each claim with the vision model of your choice. No
                  API key? It runs in visual-only mode and still ships a useful
                  receipt.
                </p>
                <div
                  className="hero__cta"
                  style={{ justifyContent: "flex-start", marginTop: 26 }}
                >
                  <a className="btn btn--primary" href="#start">
                    Install Receipts
                  </a>
                  <a className="btn btn--ghost" href={SKILL}>
                    Read the skill
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section" id="start">
          <div className="cta">
            <h2 className="cta__h">Make your next PR leave a receipt.</h2>
            <p className="cta__sub">
              Free and open source. No account, no hosting, no telemetry. Five
              minutes from clone to your first receipt.
            </p>
            <pre className="code cta__code">
              <span className="c-prompt">$</span>{" "}
              <span className="c-cmd">npm</span> install{" "}
              <span className="c-flag">&amp;&amp;</span> npx playwright install
              chromium{"\n"}
              <span className="c-prompt">$</span>{" "}
              <span className="c-cmd">npx</span> receipts qa{" "}
              <span className="c-flag">--input</span>{" "}
              examples/receipt-input.json{" "}
              <span className="c-flag">--no-judge</span>
              {"\n"}
              <span className="c-prompt">$</span>{" "}
              <span className="c-cmd">npx</span> receipts build{" "}
              <span className="c-flag">--in</span> .receipts/demo-task-list
            </pre>
            <div className="cta__row">
              <a className="btn btn--primary" href={REPO}>
                Star on GitHub
              </a>
              <a className="btn btn--ghost" href={EXAMPLES}>
                Run the demo
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="footer">
        <div className="wrap footer__in">
          <div className="footer__brand">
            <a className="brand" href="#top">
              <BrandMark id="brand-footer" />
              Re<b>ceipts</b>
            </a>
            <p>
              Incumbents make AI review the PR. Receipts makes the agent prove
              its work so a human can judge it.
            </p>
          </div>
          <div className="footer__col">
            <h4>Product</h4>
            <a href="#how">How it works</a>
            <a href="#receipt">What&apos;s in a receipt</a>
            <a href="#cli">CLI</a>
            <a href="/gallery">Gallery</a>
          </div>
          <div className="footer__col">
            <h4>Open source</h4>
            <a href={REPO}>GitHub repo</a>
            <a href={SKILL}>The skill</a>
            <a href={SCHEMAS}>Data contracts</a>
            <a href={LICENSE}>MIT license</a>
          </div>
        </div>
        <div className="wrap footer__bottom">
          <span>© 2026 Receipts · MIT licensed · No telemetry.</span>
          <span>Generated by Receipts — watch the work.</span>
        </div>
      </footer>

      <RevealOnScroll />
    </div>
  );
}
