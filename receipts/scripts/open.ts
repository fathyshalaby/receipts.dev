import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { log, parseFlags } from "./util";

export function runOpen(argv: string[]): number {
  const flags = parseFlags(argv);
  const inDir = resolve((flags.in as string) || ".");
  const html = join(inDir, "index.html");
  if (!existsSync(html)) {
    log.err(`index.html not found in ${inDir}. Run \`receipts build\` first.`);
    return 2;
  }

  const opener =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "start"
        : "xdg-open";

  log.info(`opening ${html}`);
  try {
    const child = spawn(opener, [html], {
      stdio: "ignore",
      detached: true,
      shell: process.platform === "win32",
    });
    child.unref();
  } catch (e: any) {
    log.warn(`could not launch a browser (${e?.message ?? e}). Open this file manually:`);
    console.log(`file://${html}`);
  }
  return 0;
}
