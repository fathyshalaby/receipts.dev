import { describe, it, expect } from "vitest";
import { parseNavSteps, buildNavPrompt } from "../receipts/scripts/nav";
import { selectMode } from "../receipts/scripts/publish";
import { resolveCredentials } from "../receipts/scripts/credentials";
import { receiptId } from "../receipts/scripts/util";
import { sha256Hex } from "../receipts/scripts/tokens";
import { reconcileVerdict, sampleFrames } from "../receipts/scripts/judge";
import { mergeCriteria } from "../receipts/scripts/qa";
import {
  canonicalize,
  hmacSha256Hex,
  computeManifestHash,
  signaturePayload,
} from "../receipts/scripts/integrity";

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
