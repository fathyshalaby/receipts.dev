#!/usr/bin/env node
import { runQa } from "./qa";
import { runBuild } from "./build";
import { runOpen } from "./open";
import { runPublish } from "./publish";
import { runTokens } from "./tokens";
import { runLogin, runLogout, runWhoami } from "./login";
import { generatorVersion } from "./util";

const HELP = `Receipts — watch the work.
Make a coding agent leave receipts: a recorded visual-QA walkthrough + the
reasoning behind a PR, packaged as one self-contained artefact.

Usage:
  receipts qa      --input receipt-input.json [--url URL] [--start "CMD"] [--no-judge] [--out DIR]
  receipts build   --in .receipts/<id>
  receipts open    --in .receipts/<id>
  receipts publish --in .receipts/<id> [--visibility unlisted|public] [--dry-run]
  receipts login   --token <T> | --supabase-url <U> --supabase-key <K>
  receipts logout | whoami
  receipts tokens  issue|revoke|list        (operator — hosted mode)
  receipts --version | --help

Env:
  RECEIPTS_API_KEY       Anthropic API key for the vision judge (omit for visual-only).
  RECEIPTS_MODEL         Judge model id (default: claude-sonnet-4-6).

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
