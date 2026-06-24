#!/usr/bin/env node
// Thin launcher: runs the TypeScript CLI through tsx so there is no build step.
// Keeps a single source of truth (receipts/scripts/*.ts) for both the npm
// package bin and the Anthropic Agent Skill.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const cli = join(here, "..", "receipts", "scripts", "cli.ts");
const require = createRequire(import.meta.url);

let tsxCli;
try {
  // tsx ships a CLI entry we can hand to node.
  tsxCli = require.resolve("tsx/cli");
} catch {
  console.error(
    "[receipts] Could not find 'tsx'. Install dependencies first: `npm install`."
  );
  process.exit(1);
}

const child = spawn(
  process.execPath,
  [tsxCli, cli, ...process.argv.slice(2)],
  { stdio: "inherit" }
);

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
