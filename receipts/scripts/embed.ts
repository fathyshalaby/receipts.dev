import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, join, resolve } from "node:path";
import type { Manifest, QaResult } from "./types";
import { esc, log, parseFlags } from "./util";
import { transcodeSessionMp4 } from "./media";

export type EmbedFormat = "origin" | "github";

export const GITHUB_COMMENT_MARKER = "<!-- receipts-comment -->";
export const ORIGIN_WALKTHROUGH_START = "<!-- receipts-walkthrough -->";
export const ORIGIN_WALKTHROUGH_END = "<!-- /receipts-walkthrough -->";
export const DEFAULT_ARTIFACTS_DIR = "/opt/cursor/artifacts";

export interface EmbedOptions {
  format: EmbedFormat;
  inDir: string;
  artifactsDir?: string;
  mediaBase?: string;
  artefactUrl?: string;
  reportUrl?: string;
}

export interface EmbedResult {
  body: string;
  copied: string[];
}

/** `/opt/cursor/artifacts` when that directory exists (Cursor Cloud). */
export function defaultArtifactsDir(): string | null {
  return existsSync(DEFAULT_ARTIFACTS_DIR) ? DEFAULT_ARTIFACTS_DIR : null;
}

/**
 * Pick a format: explicit flag wins; otherwise Origin when an artifacts dir is
 * available (Cloud), GitHub everywhere else.
 */
export function resolveFormat(
  explicit: string | undefined,
  artifactsDir: string | null
): EmbedFormat {
  if (explicit === "origin" || explicit === "github") return explicit;
  return artifactsDir ? "origin" : "github";
}

/**
 * Short snake_case name for a receipt media file dropped into the artifacts dir.
 * `media/session.mp4` → `walkthrough.mp4`; `media/ac1-before.png` → `ac1_before.png`.
 */
export function artifactNameFor(rel: string): string {
  const base = basename(rel.replace(/\\/g, "/"));
  if (base === "session.mp4") return "walkthrough.mp4";
  if (base === "session.webm") return "walkthrough.webm";
  if (base === "session.gif") return "walkthrough.gif";
  return base.replace(/-/g, "_");
}

export function joinMediaUrl(base: string | undefined, rel: string): string {
  if (!base) return rel;
  return `${base.replace(/\/$/, "")}/${rel.replace(/^\.\//, "")}`;
}

type VideoKind = "mp4" | "webm" | "gif";

/** Prefer H.264, then the Playwright WebM. GIF is GitHub-inline only. */
export function pickWalkthroughFile(
  inDir: string,
  preferGif: boolean
): { rel: string; kind: VideoKind } | null {
  const candidates: { rel: string; kind: VideoKind }[] = preferGif
    ? [
        { rel: "media/session.gif", kind: "gif" },
        { rel: "media/session.mp4", kind: "mp4" },
        { rel: "media/session.webm", kind: "webm" },
      ]
    : [
        { rel: "media/session.mp4", kind: "mp4" },
        { rel: "media/session.webm", kind: "webm" },
      ];
  for (const c of candidates) {
    if (existsSync(join(inDir, c.rel))) return c;
  }
  return null;
}

function mdCell(s: string): string {
  return String(s).replace(/\|/g, "\\|");
}

function reasoningBlock(m: Manifest): string {
  const plan = m.input.plan?.trim();
  const decisions = (m.input.decisions ?? []).filter(Boolean);
  const rejected = (m.input.rejectedAlternatives ?? []).filter(Boolean);
  if (!plan && decisions.length === 0 && rejected.length === 0) return "";
  const bits: string[] = [];
  if (plan) bits.push(`**Plan:** ${plan}`);
  if (decisions.length) {
    bits.push("**Decisions:**", ...decisions.map((d) => `- ${d}`));
  }
  if (rejected.length) {
    bits.push("**Rejected alternatives:**", ...rejected.map((d) => `- ${d}`));
  }
  return [
    "<details>",
    "<summary>How the agent thought</summary>",
    "",
    ...bits,
    "",
    "</details>",
    "",
  ].join("\n");
}

function summaryLine(m: Manifest): string {
  const s = m.qa.summary ?? { pass: 0, fail: 0, inconclusive: 0, not_tested: 0 };
  return `<sub>pass: ${s.pass ?? 0} · fail: ${s.fail ?? 0} · inconclusive: ${s.inconclusive ?? 0} · not_tested: ${s.not_tested ?? 0}</sub>`;
}

function footer(artefactUrl?: string, reportUrl?: string): string {
  if (reportUrl) {
    return `<sub>Full interactive report: [${esc(reportUrl)}](${esc(reportUrl)})</sub>`;
  }
  if (artefactUrl) {
    return `<sub>Prefer a local copy? [Download the artefact](${esc(artefactUrl)}) and open \`index.html\` for the full interactive report.</sub>`;
  }
  return "<sub>Download the `receipt` artefact from the workflow run and open `index.html` for the full interactive report.</sub>";
}

function claimHeading(r: QaResult): string {
  return `**${mdCell(r.acId)} — ${mdCell(r.claim)}**`;
}

export interface RenderEmbedArgs {
  format: EmbedFormat;
  manifest: Manifest;
  videoSrc: string | null;
  videoKind: VideoKind | null;
  fullQuality: { label: string; href: string }[];
  imageSrc: (rel: string) => string;
  artefactUrl?: string;
  reportUrl?: string;
  /** False when GitHub has no raw-URL base (fork PR / push failed) — text only. */
  inlineMedia?: boolean;
}

/** Pure: Walkthrough markdown/HTML from a manifest + already-resolved media URLs. */
export function renderEmbedBody(args: RenderEmbedArgs): string {
  const { format, manifest: m, videoSrc, videoKind, fullQuality, imageSrc } = args;
  const inlineMedia = args.inlineMedia !== false;
  const lines: string[] = [];

  if (format === "github") lines.push(GITHUB_COMMENT_MARKER);
  else lines.push(ORIGIN_WALKTHROUGH_START);

  lines.push("## Walkthrough", "");

  if (!inlineMedia) {
    lines.push(
      "A visual-QA walkthrough + reasoning record for this PR has been generated.",
      ""
    );
    if (m.qa.results?.length) lines.push(summaryLine(m), "");
    const thought = reasoningBlock(m);
    if (thought) lines.push(thought);
    lines.push(footer(args.artefactUrl, args.reportUrl));
    if (format === "origin") lines.push("", ORIGIN_WALKTHROUGH_END);
    return lines.join("\n");
  }

  if (m.qa.reasoningOnly || !m.qa.results?.length) {
    lines.push(
      "A reasoning-only record for this PR has been generated (no visual QA ran).",
      ""
    );
    const thought = reasoningBlock(m);
    if (thought) lines.push(thought);
    lines.push(footer(args.artefactUrl, args.reportUrl));
    if (format === "origin") lines.push("", ORIGIN_WALKTHROUGH_END);
    return lines.join("\n");
  }

  if (videoSrc && videoKind === "gif") {
    lines.push(`![recorded walkthrough](${videoSrc})`, "");
  } else if (videoSrc && format === "origin") {
    lines.push(`<video src="${esc(videoSrc)}"></video>`, "");
  } else if (videoSrc && videoKind) {
    // GitHub will not autoplay a raw-URL mp4/webm — link it.
    lines.push(`[Watch the walkthrough (${videoKind})](${videoSrc})`, "");
  }

  if (fullQuality.length) {
    const links = fullQuality
      .map((f) => `[${f.label}](${f.href})`)
      .join(" · ");
    const note =
      videoKind === "gif"
        ? "Downscaled GIF so it actually plays here — full quality: "
        : "Full quality: ";
    lines.push(`<sub>${note}${links}</sub>`, "");
  }

  lines.push("### Acceptance criteria — expected vs actual", "");
  for (const r of m.qa.results) {
    lines.push(claimHeading(r), "");
    const before = r.screenshots?.before;
    const after = r.screenshots?.after;
    if (before && after) {
      if (format === "origin") {
        lines.push(
          "Before | After",
          ":--:|:--:",
          `<img alt="${esc(r.acId)} before" src="${esc(imageSrc(before))}" /> | <img alt="${esc(r.acId)} after" src="${esc(imageSrc(after))}" />`,
          ""
        );
      } else {
        lines.push(
          "Before | After",
          ":--:|:--:",
          `![before](${imageSrc(before)}) | ![after](${imageSrc(after)})`,
          ""
        );
      }
    } else if (after) {
      if (format === "origin") {
        lines.push(`<img alt="${esc(r.acId)} result" src="${esc(imageSrc(after))}" />`, "");
      } else {
        lines.push(`![result](${imageSrc(after)})`, "");
      }
    }
  }
  lines.push(summaryLine(m), "");

  const thought = reasoningBlock(m);
  if (thought) lines.push(thought);

  lines.push(footer(args.artefactUrl, args.reportUrl));
  if (format === "origin") lines.push("", ORIGIN_WALKTHROUGH_END);
  return lines.join("\n");
}

function copyIfPresent(src: string, destDir: string, name: string, copied: string[]): string | null {
  if (!existsSync(src)) return null;
  mkdirSync(destDir, { recursive: true });
  const dest = join(destDir, name);
  copyFileSync(src, dest);
  copied.push(dest);
  return dest;
}

/** Load a built receipt, copy walkthrough media, and render the PR Walkthrough. */
export function buildEmbed(opts: EmbedOptions): EmbedResult {
  const inDir = resolve(opts.inDir);
  const manifestPath = join(inDir, "manifest.json");
  if (!existsSync(manifestPath)) {
    throw new Error(`manifest.json not found in ${inDir}. Run \`receipts build\` first.`);
  }
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Manifest;
  // Transcode before copying to artifacts so Origin gets H.264. GitHub format
  // must not write new media — CI already committed the folder.
  if (opts.format === "origin") transcodeSessionMp4(join(inDir, "media"));

  const copied: string[] = [];
  const video = pickWalkthroughFile(inDir, opts.format === "github");
  let videoSrc: string | null = null;
  const fullQuality: { label: string; href: string }[] = [];

  if (opts.format === "origin") {
    const artifactsDir = opts.artifactsDir || defaultArtifactsDir() || DEFAULT_ARTIFACTS_DIR;
    if (video) {
      const dest = copyIfPresent(
        join(inDir, video.rel),
        artifactsDir,
        artifactNameFor(video.rel),
        copied
      );
      videoSrc = dest;
    }
    const imageSrc = (rel: string) => {
      const dest = copyIfPresent(join(inDir, rel), artifactsDir, artifactNameFor(rel), copied);
      return dest ?? join(artifactsDir, artifactNameFor(rel));
    };
    for (const extra of ["media/session.mp4", "media/session.webm"] as const) {
      if (video && extra === video.rel) continue;
      if (!existsSync(join(inDir, extra))) continue;
      copyIfPresent(join(inDir, extra), artifactsDir, artifactNameFor(extra), copied);
    }
    const body = renderEmbedBody({
      format: "origin",
      manifest,
      videoSrc,
      videoKind: video?.kind ?? null,
      fullQuality,
      imageSrc,
      artefactUrl: opts.artefactUrl,
      reportUrl: opts.reportUrl,
    });
    return { body, copied };
  }

  // GitHub: GIF inline (if present), raw URLs via --media-base.
  // Without a media-base the comment can't resolve relative paths, so skip
  // inline media (same fallback as a fork PR whose preview commit couldn't push).
  const inlineMedia = !!opts.mediaBase;
  const imageSrc = (rel: string) => joinMediaUrl(opts.mediaBase, rel);
  if (inlineMedia && video) videoSrc = joinMediaUrl(opts.mediaBase, video.rel);
  if (inlineMedia) {
    for (const [rel, label] of [
      ["media/session.mp4", "session.mp4"],
      ["media/session.webm", "session.webm"],
    ] as const) {
      if (!existsSync(join(inDir, rel))) continue;
      if (video && rel === video.rel) continue;
      fullQuality.push({ label, href: joinMediaUrl(opts.mediaBase, rel) });
    }
  }
  const body = renderEmbedBody({
    format: "github",
    manifest,
    videoSrc,
    videoKind: inlineMedia ? video?.kind ?? null : null,
    fullQuality,
    imageSrc,
    artefactUrl: opts.artefactUrl,
    reportUrl: opts.reportUrl,
    inlineMedia,
  });
  return { body, copied };
}

export function runEmbed(argv: string[]): number {
  const flags = parseFlags(argv);
  const inDir = resolve((flags.in as string) || ".");
  const artifactsDir =
    (flags["artifacts-dir"] as string | undefined) || defaultArtifactsDir() || undefined;
  const format = resolveFormat(flags.format as string | undefined, artifactsDir ?? null);
  const out = flags.out as string | undefined;

  let result: EmbedResult;
  try {
    result = buildEmbed({
      format,
      inDir,
      artifactsDir,
      mediaBase: flags["media-base"] as string | undefined,
      artefactUrl: flags["artefact-url"] as string | undefined,
      reportUrl: flags["report-url"] as string | undefined,
    });
  } catch (e: any) {
    log.err(e?.message ?? String(e));
    return 2;
  }

  if (out) {
    writeFileSync(out, result.body.endsWith("\n") ? result.body : `${result.body}\n`);
    log.ok(`wrote Walkthrough → ${out}  (format: ${format})`);
  } else {
    process.stdout.write(result.body.endsWith("\n") ? result.body : `${result.body}\n`);
  }
  if (result.copied.length) {
    log.info(`copied ${result.copied.length} media file(s) to artifacts dir`);
  }
  return 0;
}
