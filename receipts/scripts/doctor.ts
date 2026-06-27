import { log } from "./util";
import { launchBrowser } from "./qa";

// `receipts doctor` — a local preflight so a developer on a laptop knows in one
// command whether the machine can produce a receipt, and exactly what to fix if
// not. Exits non-zero only on blocking problems (Node too old, no browser).

function nodeOk(): { ok: boolean; version: string } {
  const v = process.versions.node;
  const [maj, min] = v.split(".").map(Number);
  return { ok: maj > 18 || (maj === 18 && min >= 18), version: v };
}

export async function runDoctor(): Promise<number> {
  log.info("doctor — checking whether this machine can produce a receipt\n");
  let blocking = 0;

  const n = nodeOk();
  if (n.ok) log.ok(`Node ${n.version} (>= 18.18 required)`);
  else {
    log.err(`Node ${n.version} is too old — Receipts needs Node >= 18.18.`);
    blocking++;
  }

  // The one that actually bites people on a fresh laptop.
  try {
    const b = await launchBrowser();
    const ver = b.version();
    await b.close();
    log.ok(`Chromium launches (v${ver})`);
  } catch (e: any) {
    log.err(`Chromium could not launch: ${e?.message ?? e}`);
    log.info("       fix:  npx playwright install chromium");
    log.info("       or:   set RECEIPTS_CHROMIUM_PATH to a system Chrome/Chromium binary");
    blocking++;
  }

  if (process.env.RECEIPTS_API_KEY) {
    const model = process.env.RECEIPTS_MODEL || "claude-sonnet-4-6";
    log.ok(`RECEIPTS_API_KEY set — LLM judge + adversarial verdicts on (model: ${model})`);
  } else {
    log.warn(
      "RECEIPTS_API_KEY not set — visual-only mode (verdicts = not_tested). Still a valid " +
        "receipt; set the key for pass/fail/inconclusive verdicts."
    );
  }

  if (process.env.RECEIPTS_SIGNING_KEY) {
    log.ok("RECEIPTS_SIGNING_KEY set — built receipts will be HMAC-signed.");
  }

  console.log("");
  if (blocking === 0) {
    log.ok("Ready. Try:  npm run demo   (or: receipts qa --input receipt-input.json)");
    return 0;
  }
  log.err(`${blocking} blocking problem(s) above — fix them, then re-run \`receipts doctor\`.`);
  return 1;
}
