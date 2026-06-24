#!/usr/bin/env node
import { runQa } from "./qa";
import { runBuild } from "./build";
import { runOpen } from "./open";
import { generatorVersion } from "./util";

const HELP = `Receipts — watch the work.
Make a coding agent leave receipts: a recorded visual-QA walkthrough + the
reasoning behind a PR, packaged as one self-contained artefact.

Usage:
  receipts qa     --input receipt-input.json [--url URL] [--start "CMD"] [--no-judge] [--out DIR]
  receipts build  --in .receipts/<id>
  receipts open   --in .receipts/<id>
  receipts --version | --help

Env:
  RECEIPTS_API_KEY   Anthropic API key for the vision judge (omit for visual-only).
  RECEIPTS_MODEL     Judge model id (default: claude-sonnet-4-6).
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
