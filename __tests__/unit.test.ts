import { describe, it, expect } from "vitest";
import { parseNavSteps, buildNavPrompt } from "../receipts/scripts/nav";
import { selectMode } from "../receipts/scripts/publish";
import { resolveCredentials } from "../receipts/scripts/credentials";
import { receiptId } from "../receipts/scripts/util";
import { sha256Hex } from "../receipts/scripts/tokens";

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
