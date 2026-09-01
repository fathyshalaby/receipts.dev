#!/usr/bin/env node
import { runQa } from "./qa";
import { runBuild } from "./build";
import { runOpen } from "./open";
import { runPublish } from "./publish";
import { runVerify } from "./verify";
import { runDoctor } from "./doctor";
import { runTokens } from "./tokens";
import { runLogin, runLogout, runWhoami } from "./login";
import { runEmbed } from "./embed";
import { generatorVersion } from "./util";

const HELP = `Receipts — watch the work.
Make a coding agent leave receipts: a recorded visual-QA walkthrough + the
reasoning behind a PR, packaged as one self-contained artefact.

Usage:
  receipts qa      --input receipt-input.json [--url URL] [--start "CMD"]
                   [--contract claims.json] [--no-judge] [--no-adversarial]
                   [--max-judge-calls N] [--out DIR]
  receipts build   --in .receipts/<id>
  receipts embed   --in .receipts/<id> [--format origin|github]
                   [--artifacts-dir DIR] [--media-base URL] [--artefact-url URL]
                   [--report-url URL] [--github-repo owner/repo] [--video-url URL]
                   [--upload] [--out FILE]
  receipts verify  --in .receipts/<id> [--key <K>]
  receipts doctor                          (preflight: can this machine make a receipt?)
  receipts open    --in .receipts/<id>
  receipts publish --in .receipts/<id> [--visibility unlisted|public] [--dry-run]
  receipts login   --token <T> | --supabase-url <U> --supabase-key <K>
  receipts logout | whoami
  receipts tokens  issue|revoke|list        (operator — hosted mode)
  receipts --version | --help

Env:
  RECEIPTS_API_KEY        Anthropic API key for the vision judge (omit for visual-only).
  RECEIPTS_MODEL          Judge model id (default: claude-sonnet-4-6).
  RECEIPTS_CHROMIUM_PATH  System Chrome/Chromium binary (fallback if the pinned build is absent).
  RECEIPTS_MAX_JUDGE_CALLS  Cap on vision-model calls per run (cost ceiling; 0 = unlimited).
  RECEIPTS_GITHUB_TOKEN   PAT used with embed --upload to attach the MP4 as a
                          native GitHub player. Default GitHub comments use a
                          GIF (lighter). GH_TOKEN / GITHUB_TOKEN also work.

  # publish — bring-your-own Supabase (service role; bypasses RLS):
  RECEIPTS_SUPABASE_URL  Your Supabase project URL.
  RECEIPTS_SUPABASE_KEY  Service-role key for that project.

  # publish — hosted ("ours"):
  RECEIPTS_TOKEN         Upload token issued by the hosted service.
  RECEIPTS_INGEST_URL    Ingest endpoint (if not built into the CLI).
`;

async function main(): Promise<number> {
  const [cmd, ...rest] = process.argv.slice(2);

  if (!cmd || cmd === "--help" || cmd === "-h" || cmd === "help") {
    console.log(HELP);
    return 0;
  }
  if (cmd === "--version" || cmd === "-v") {
    console.log(generatorVersion());
    return 0;
  }

  switch (cmd) {
    case "qa":
      return runQa(rest);
    case "build":
      return runBuild(rest);
    case "embed":
      return runEmbed(rest);
    case "verify":
      return runVerify(rest);
    case "doctor":
      return runDoctor();
    case "open":
      return runOpen(rest);
    case "publish":
      return runPublish(rest);
    case "tokens":
      return runTokens(rest);
    case "login":
      return runLogin(rest);
    case "logout":
      return runLogout();
    case "whoami":
      return runWhoami();
    default:
      console.error(`[receipts] unknown command: ${cmd}\n`);
      console.log(HELP);
      return 1;
  }
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    console.error(`[receipts] fatal: ${e?.stack ?? e}`);
    process.exit(1);
  });
