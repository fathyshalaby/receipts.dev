import { describe, it, expect } from "vitest";
import { parseNavSteps, buildNavPrompt } from "../receipts/scripts/nav";
import { selectMode } from "../receipts/scripts/publish";
import { resolveCredentials } from "../receipts/scripts/credentials";
import { receiptId, safeFileToken } from "../receipts/scripts/util";
import { sha256Hex } from "../receipts/scripts/tokens";
import { reconcileVerdict, sampleFrames } from "../receipts/scripts/judge";
import { mergeCriteria } from "../receipts/scripts/qa";
import {
  canonicalize,
  hmacSha256Hex,
  computeManifestHash,
  signaturePayload,
} from "../receipts/scripts/integrity";
import {
  artifactNameFor,
  buildEmbed,
  GITHUB_COMMENT_MARKER,
  joinMediaUrl,
  ORIGIN_WALKTHROUGH_START,
  pickWalkthroughFile,
  renderEmbedBody,
  resolveFormat,
} from "../receipts/scripts/embed";
import {
  mimeForAttachment,
  parseGithubRepo,
  uploadGithubAttachment,
} from "../receipts/scripts/github-attach";
import type { Manifest } from "../receipts/scripts/types";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("parseNavSteps", () => {
  it("keeps valid steps and coerces shape", () => {
    const out = parseNavSteps(
      'here you go: [{"action":"click","selector":"#go"},{"action":"fill","selector":"#q","value":"hi"},{"action":"press","value":"Enter"}]',
    );
    expect(out).toEqual([
      { action: "click", selector: "#go" },
      { action: "fill", selector: "#q", value: "hi" },
      { action: "press", value: "Enter" },
    ]);
  });

  it("drops actions outside the allowed vocabulary", () => {
    const out = parseNavSteps('[{"action":"evaluate","value":"alert(1)"},{"action":"click","selector":"#ok"}]');
    expect(out).toEqual([{ action: "click", selector: "#ok" }]);
  });

  it("drops selector-requiring steps that have no selector", () => {
    expect(parseNavSteps('[{"action":"click"}]')).toEqual([]);
  });

  it("returns [] for non-array / garbage", () => {
    expect(parseNavSteps("no json here")).toEqual([]);
    expect(parseNavSteps('{"action":"click","selector":"#x"}')).toEqual([]);
  });

  it("caps the number of steps", () => {
    const many = JSON.stringify(Array.from({ length: 50 }, () => ({ action: "wait", value: 1 })));
    expect(parseNavSteps(many).length).toBeLessThanOrEqual(12);
  });
});

describe("buildNavPrompt", () => {
  it("includes the goal, url and element selectors", () => {
    const p = buildNavPrompt("open settings", "http://localhost:3000", [
      { tag: "a", text: "Settings", selector: "#settings" },
    ]);
    expect(p).toContain("open settings");
    expect(p).toContain("http://localhost:3000");
    expect(p).toContain("#settings");
  });
});

describe("selectMode", () => {
  it("prefers BYO when supabase url + key present", () => {
    expect(selectMode({ supabaseUrl: "u", supabaseKey: "k", token: "t" })).toBe("byo");
  });
  it("falls back to hosted when only a token is present", () => {
    expect(selectMode({ token: "t" })).toBe("hosted");
  });
  it("is none when nothing configured", () => {
    expect(selectMode({})).toBe("none");
  });
  it("does not pick BYO with only a url", () => {
    expect(selectMode({ supabaseUrl: "u" })).toBe("none");
  });
});

describe("resolveCredentials", () => {
  it("lets env override the saved config", () => {
    const out = resolveCredentials(
      { RECEIPTS_TOKEN: "env-tok", RECEIPTS_SUPABASE_URL: "env-url" },
      { token: "file-tok", supabaseUrl: "file-url", supabaseKey: "file-key" },
    );
    expect(out.token).toBe("env-tok");
    expect(out.supabaseUrl).toBe("env-url");
    expect(out.supabaseKey).toBe("file-key"); // not in env → from file
  });

  it("uses the file config when env is empty", () => {
    const out = resolveCredentials({}, { token: "file-tok", ingestUrl: "file-ingest" });
    expect(out.token).toBe("file-tok");
    expect(out.ingestUrl).toBe("file-ingest");
  });
});

describe("receiptId", () => {
  it("uses pr-<n> when a PR number exists", () => {
    expect(receiptId(42, "feat/whatever")).toBe("pr-42");
  });
  it("sanitizes a branch name when no PR", () => {
    expect(receiptId(null, "feat/Empty State!")).toBe("feat-empty-state");
  });
  it("falls back to 'branch' for an empty name", () => {
    expect(receiptId(null, "")).toBe("branch");
  });
});

describe("safeFileToken", () => {
  it("leaves a normal claim id unchanged", () => {
    expect(safeFileToken("ac1")).toBe("ac1");
  });
  it("strips path separators and traversal segments (contract ids are untrusted)", () => {
    expect(safeFileToken("../../../../tmp/pwned")).not.toContain("/");
    expect(safeFileToken("../../../../tmp/pwned")).not.toContain("..");
  });
  it("falls back to a placeholder when nothing safe survives", () => {
    expect(safeFileToken("...")).toBe("claim");
    expect(safeFileToken("")).toBe("claim");
  });
});

describe("sha256Hex", () => {
  it("matches a known vector", () => {
    // echo -n "abc" | sha256sum
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});

describe("reconcileVerdict", () => {
  it("downgrades a refuted pass to inconclusive", () => {
    expect(reconcileVerdict("pass", true)).toBe("inconclusive");
  });
  it("leaves an unrefuted pass alone", () => {
    expect(reconcileVerdict("pass", false)).toBe("pass");
  });
  it("never invents a failure from a refuted non-pass", () => {
    expect(reconcileVerdict("fail", true)).toBe("fail");
    expect(reconcileVerdict("inconclusive", true)).toBe("inconclusive");
    expect(reconcileVerdict("not_tested", true)).toBe("not_tested");
  });
});

describe("sampleFrames", () => {
  it("returns frames unchanged when under the cap", () => {
    expect(sampleFrames(["a", "b", "c"], 8)).toEqual(["a", "b", "c"]);
  });
  it("always keeps the first and last frame", () => {
    const many = Array.from({ length: 30 }, (_, i) => `f${i}`);
    const out = sampleFrames(many, 8);
    expect(out.length).toBeLessThanOrEqual(8);
    expect(out[0]).toBe("f0");
    expect(out[out.length - 1]).toBe("f29");
  });
});

describe("mergeCriteria", () => {
  const input: any = { acceptanceCriteria: [{ id: "a", claim: "A" }] };
  it("tags input claims as agent-authored (self-graded)", () => {
    const out = mergeCriteria(input);
    expect(out).toEqual([{ id: "a", claim: "A", source: "agent" }]);
  });
  it("an independent contract overrides by id and is tagged `contract`", () => {
    const out = mergeCriteria(input, [
      { id: "a", claim: "A2" } as any,
      { id: "b", claim: "B" } as any,
    ]);
    expect(out).toHaveLength(2);
    const a = out.find((c) => c.id === "a")!;
    expect(a.claim).toBe("A2");
    expect(a.source).toBe("contract");
    expect(out.find((c) => c.id === "b")!.source).toBe("contract");
  });
});

describe("canonicalize", () => {
  it("sorts object keys recursively so the hash is stable", () => {
    expect(canonicalize({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
    expect(canonicalize({ a: { d: 1, c: 2 }, b: [3, { f: 1, e: 2 }] })).toBe(
      '{"a":{"c":2,"d":1},"b":[3,{"e":2,"f":1}]}',
    );
  });
  it("is order-independent for the same data", () => {
    expect(canonicalize({ x: 1, y: 2 })).toBe(canonicalize({ y: 2, x: 1 }));
  });
});

describe("hmacSha256Hex", () => {
  it("matches the RFC test vector", () => {
    expect(hmacSha256Hex("key", "The quick brown fox jumps over the lazy dog")).toBe(
      "f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8",
    );
  });
});

describe("computeManifestHash", () => {
  it("ignores the integrity field (so it can be embedded after hashing)", () => {
    const withSig = { schemaVersion: "1", input: { task: "x" }, integrity: { algo: "sha256" } };
    const without = { schemaVersion: "1", input: { task: "x" } };
    expect(computeManifestHash(withSig)).toBe(computeManifestHash(without));
  });
  it("changes when the data changes", () => {
    expect(computeManifestHash({ input: { task: "x" } })).not.toBe(
      computeManifestHash({ input: { task: "y" } }),
    );
  });
});

describe("signaturePayload", () => {
  it("is stable regardless of file-map insertion order", () => {
    expect(signaturePayload("M", { b: "2", a: "1" })).toBe(
      signaturePayload("M", { a: "1", b: "2" }),
    );
    expect(signaturePayload("M", { a: "1", b: "2" })).toBe("M\na:1\nb:2");
  });
});

function fixtureManifest(over: Partial<Manifest> = {}): Manifest {
  return {
    schemaVersion: "1",
    generatorVersion: "0.1.0",
    generatedAt: "2026-01-01T00:00:00.000Z",
    overallVerdict: "visual-only",
    repo: "https://github.com/acme/app",
    commit: "abc123",
    input: {
      schemaVersion: "1",
      task: "Add empty state",
      branch: "feat/empty",
      prNumber: 13,
      targetUrl: "http://localhost:3000",
      startCommand: null,
      acceptanceCriteria: [
        { id: "ac1", claim: "Empty-state text 'No projects yet' is visible" },
      ],
      plan: "Render EmptyState",
      decisions: ["Reused shared EmptyState"],
      rejectedAlternatives: ["Onboarding wizard"],
      promptLog: [],
      filesChanged: [],
    },
    qa: {
      schemaVersion: "1",
      startedAt: "2026-01-01T00:00:00.000Z",
      durationMs: 1000,
      videoPath: "media/session.webm",
      tracePath: null,
      reasoningOnly: false,
      results: [
        {
          acId: "ac1",
          claim: "Empty-state text 'No projects yet' is visible",
          verdict: "not_tested",
          judge: "none",
          rationale: null,
          screenshots: { before: "media/ac1-before.png", after: "media/ac1-after.png" },
        },
      ],
      summary: { pass: 0, fail: 0, inconclusive: 0, not_tested: 1 },
    },
    ...over,
  };
}

describe("artifactNameFor", () => {
  it("maps the session recording to walkthrough.*", () => {
    expect(artifactNameFor("media/session.mp4")).toBe("walkthrough.mp4");
    expect(artifactNameFor("media/session.webm")).toBe("walkthrough.webm");
    expect(artifactNameFor("media/session.gif")).toBe("walkthrough.gif");
  });
  it("snake_cases claim screenshots", () => {
    expect(artifactNameFor("media/ac1-before.png")).toBe("ac1_before.png");
    expect(artifactNameFor("media/ac1-after.png")).toBe("ac1_after.png");
  });
});

describe("joinMediaUrl / resolveFormat", () => {
  it("joins a raw-URL base without a double slash", () => {
    expect(joinMediaUrl("https://raw.example/sha/dir/", "media/session.gif")).toBe(
      "https://raw.example/sha/dir/media/session.gif",
    );
  });
  it("returns the relative path when no base is set", () => {
    expect(joinMediaUrl(undefined, "media/x.png")).toBe("media/x.png");
  });
  it("defaults to origin when an artifacts dir is available", () => {
    expect(resolveFormat(undefined, "/opt/cursor/artifacts")).toBe("origin");
    expect(resolveFormat(undefined, null)).toBe("github");
    expect(resolveFormat("github", "/opt/cursor/artifacts")).toBe("github");
  });
});

describe("renderEmbedBody", () => {
  const m = fixtureManifest();
  const imageSrc = (rel: string) => `/opt/cursor/artifacts/${rel.replace("media/", "").replace(/-/g, "_")}`;

  it("emits Origin-style native video + img tags", () => {
    const body = renderEmbedBody({
      format: "origin",
      manifest: m,
      videoSrc: "/opt/cursor/artifacts/walkthrough.mp4",
      videoKind: "mp4",
      fullQuality: [],
      imageSrc,
    });
    expect(body).toContain(ORIGIN_WALKTHROUGH_START);
    expect(body).toContain('<video src="/opt/cursor/artifacts/walkthrough.mp4"></video>');
    expect(body).toContain('<img alt="ac1 before" src="/opt/cursor/artifacts/ac1_before.png" />');
    expect(body).toContain("How the agent thought");
    expect(body).toContain("Render EmptyState");
    expect(body).not.toContain(GITHUB_COMMENT_MARKER);
  });

  it("emits a GitHub comment with a GIF (not an inline video tag)", () => {
    const raw = (rel: string) => `https://raw.githubusercontent.com/acme/app/sha/.receipts/pr-13/${rel}`;
    const body = renderEmbedBody({
      format: "github",
      manifest: m,
      videoSrc: raw("media/session.mp4"),
      videoKind: "mp4",
      gifSrc: raw("media/session.gif"),
      fullQuality: [{ label: "session.webm", href: raw("media/session.webm") }],
      imageSrc: raw,
    });
    expect(body.startsWith(GITHUB_COMMENT_MARKER)).toBe(true);
    expect(body).not.toContain("<video");
    expect(body).toContain("![recorded walkthrough](");
    expect(body).toContain("session.gif");
    expect(body).toContain("![before](");
    expect(body).toContain("session.webm");
    expect(body).toContain("GIF preview · full quality:");
    expect(body).toContain("pass: 0 · fail: 0");
  });

  it("emits a GitHub native player URL on its own line", () => {
    const raw = (rel: string) => `https://raw.githubusercontent.com/acme/app/sha/.receipts/pr-13/${rel}`;
    const player = "https://github.com/user-attachments/assets/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const body = renderEmbedBody({
      format: "github",
      manifest: m,
      videoSrc: null,
      videoKind: null,
      playerSrc: player,
      gifSrc: null,
      fullQuality: [],
      imageSrc: raw,
    });
    expect(body).toContain(`\n${player}\n`);
    expect(body).not.toContain("<video");
    expect(body).not.toContain("![recorded walkthrough]");
  });

  it("falls back to text-only when GitHub cannot inline media", () => {
    const body = renderEmbedBody({
      format: "github",
      manifest: m,
      videoSrc: null,
      videoKind: null,
      fullQuality: [],
      imageSrc: (rel) => rel,
      artefactUrl: "https://github.com/acme/app/actions/runs/1/artifacts/2",
      inlineMedia: false,
    });
    expect(body).toContain("A visual-QA walkthrough + reasoning record");
    expect(body).not.toContain("<video");
    expect(body).toContain("Download the artefact");
  });
});

describe("pickWalkthroughFile / buildEmbed", () => {
  it("prefers mp4 over webm for Origin, gif over both for GitHub", () => {
    const dir = mkdtempSync(join(tmpdir(), "receipts-embed-"));
    mkdirSync(join(dir, "media"));
    writeFileSync(join(dir, "media/session.webm"), "webm");
    writeFileSync(join(dir, "media/session.mp4"), "mp4");
    expect(pickWalkthroughFile(dir, false)).toEqual({ rel: "media/session.mp4", kind: "mp4" });
    writeFileSync(join(dir, "media/session.gif"), "gif");
    expect(pickWalkthroughFile(dir, true)).toEqual({ rel: "media/session.gif", kind: "gif" });
  });

  it("copies walkthrough media into the artifacts dir for origin format", () => {
    const dir = mkdtempSync(join(tmpdir(), "receipts-embed-in-"));
    const arts = mkdtempSync(join(tmpdir(), "receipts-embed-arts-"));
    mkdirSync(join(dir, "media"));
    writeFileSync(join(dir, "media/session.mp4"), "mp4-bytes");
    writeFileSync(join(dir, "media/ac1-before.png"), "before");
    writeFileSync(join(dir, "media/ac1-after.png"), "after");
    writeFileSync(join(dir, "manifest.json"), JSON.stringify(fixtureManifest()));

    const { body, copied } = buildEmbed({ format: "origin", inDir: dir, artifactsDir: arts });
    expect(copied.some((p) => p.endsWith("walkthrough.mp4"))).toBe(true);
    expect(existsSync(join(arts, "walkthrough.mp4"))).toBe(true);
    expect(existsSync(join(arts, "ac1_before.png"))).toBe(true);
    expect(existsSync(join(arts, "ac1_after.png"))).toBe(true);
    expect(body).toContain(`<video src="${join(arts, "walkthrough.mp4")}"></video>`);
  });

  it("builds a GitHub comment with a GIF and full-quality links (no video tag)", () => {
    const dir = mkdtempSync(join(tmpdir(), "receipts-embed-gh-"));
    mkdirSync(join(dir, "media"));
    writeFileSync(join(dir, "media/session.gif"), "gif");
    writeFileSync(join(dir, "media/session.webm"), "webm");
    writeFileSync(join(dir, "media/session.mp4"), "mp4-bytes-not-tiny-enough??");
    writeFileSync(join(dir, "media/ac1-after.png"), "after");
    const m = fixtureManifest();
    m.qa.results[0].screenshots.before = null;
    writeFileSync(join(dir, "manifest.json"), JSON.stringify(m));

    const { body } = buildEmbed({
      format: "github",
      inDir: dir,
      mediaBase: "https://raw.githubusercontent.com/acme/app/sha/.receipts/pr-13",
      artefactUrl: "https://example.test/artefact",
    });
    expect(body).toContain(GITHUB_COMMENT_MARKER);
    expect(body).not.toContain("<video");
    expect(body).toContain("https://raw.githubusercontent.com/acme/app/sha/.receipts/pr-13/media/session.gif");
    expect(body).toContain("session.webm");
    expect(body).toContain("session.mp4");
    expect(body).toContain("https://example.test/artefact");
  });

  it("uses a user-attachments video URL as a bare GitHub player line", () => {
    const dir = mkdtempSync(join(tmpdir(), "receipts-embed-player-"));
    mkdirSync(join(dir, "media"));
    writeFileSync(join(dir, "media/session.mp4"), "mp4");
    writeFileSync(join(dir, "media/ac1-after.png"), "after");
    writeFileSync(join(dir, "manifest.json"), JSON.stringify(fixtureManifest()));
    const player = "https://github.com/user-attachments/assets/11111111-2222-3333-4444-555555555555";
    const { body } = buildEmbed({
      format: "github",
      inDir: dir,
      mediaBase: "https://raw.githubusercontent.com/acme/app/sha/.receipts/pr-13",
      videoUrl: player,
    });
    expect(body).toContain(`\n${player}\n`);
    expect(body).not.toContain("<video");
  });
});

describe("parseGithubRepo / mimeForAttachment", () => {
  it("parses nwo, https, and ssh remotes", () => {
    expect(parseGithubRepo("acme/app")).toEqual({ owner: "acme", repo: "app" });
    expect(parseGithubRepo("https://github.com/acme/app.git")).toEqual({ owner: "acme", repo: "app" });
    expect(parseGithubRepo("git@github.com:acme/app.git")).toEqual({ owner: "acme", repo: "app" });
    expect(parseGithubRepo("not-a-repo")).toBeNull();
  });
  it("maps video extensions to MIME types", () => {
    expect(mimeForAttachment("session.mp4")).toBe("video/mp4");
    expect(mimeForAttachment("session.webm")).toBe("video/webm");
    expect(mimeForAttachment("notes.txt")).toBeNull();
  });
});

describe("uploadGithubAttachment", () => {
  it("POSTs the file and returns the user-attachments URL", async () => {
    const dir = mkdtempSync(join(tmpdir(), "receipts-attach-"));
    const file = join(dir, "session.mp4");
    writeFileSync(file, Buffer.alloc(64, 1));
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      const u = String(url);
      if (u.includes("api.github.com/repos/")) {
        return new Response(JSON.stringify({ id: 42 }), { status: 200 });
      }
      if (u.includes("uploads.github.com")) {
        expect(init?.method).toBe("POST");
        return new Response(
          JSON.stringify({ url: "https://github.com/user-attachments/assets/deadbeef-0000-0000-0000-ffffffffffff" }),
          { status: 201 },
        );
      }
      throw new Error(`unexpected fetch ${u}`);
    }) as typeof fetch;
    const url = await uploadGithubAttachment({
      file,
      owner: "acme",
      repo: "app",
      token: "gho_test",
      fetchImpl,
    });
    expect(url).toBe("https://github.com/user-attachments/assets/deadbeef-0000-0000-0000-ffffffffffff");
  });

  it("returns null when GitHub refuses the upload", async () => {
    const dir = mkdtempSync(join(tmpdir(), "receipts-attach-fail-"));
    const file = join(dir, "session.mp4");
    writeFileSync(file, Buffer.alloc(64, 1));
    const fetchImpl = (async (url: string) => {
      if (String(url).includes("api.github.com")) {
        return new Response(JSON.stringify({ id: 1 }), { status: 200 });
      }
      return new Response("nope", { status: 404 });
    }) as typeof fetch;
    const url = await uploadGithubAttachment({
      file,
      owner: "acme",
      repo: "app",
      token: "ghs_actions",
      fetchImpl,
    });
    expect(url).toBeNull();
  });
});
