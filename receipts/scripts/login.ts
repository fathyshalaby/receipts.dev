import { log, parseFlags } from "./util";
import { saveConfig, clearConfig, loadConfig, configPath } from "./credentials";

const LOGIN_HELP = `Save publish credentials locally (~/.receipts/config.json, 0600).
Env vars always override the saved config, so CI can stay env-driven.

  receipts login --token <T> [--ingest-url <U>]        # hosted ("ours")
  receipts login --supabase-url <U> --supabase-key <K> # bring-your-own
  receipts logout                                      # forget saved creds
  receipts whoami                                      # show what's configured
`;

export function runLogin(argv: string[]): number {
  const flags = parseFlags(argv);
  if (flags.help) {
    console.log(LOGIN_HELP);
    return 0;
  }

  const patch: Record<string, string> = {};
  if (typeof flags.token === "string") patch.token = flags.token;
  if (typeof flags["ingest-url"] === "string") patch.ingestUrl = flags["ingest-url"];
  if (typeof flags["supabase-url"] === "string") patch.supabaseUrl = flags["supabase-url"];
  if (typeof flags["supabase-key"] === "string") patch.supabaseKey = flags["supabase-key"];

  if (Object.keys(patch).length === 0) {
    log.err("nothing to save. Pass --token (hosted) or --supabase-url + --supabase-key (BYO).");
    console.log("\n" + LOGIN_HELP);
    return 2;
  }

  saveConfig(patch);
  const mode = patch.token ? "hosted" : "bring-your-own";
  log.ok(`saved ${mode} credentials → ${configPath()}`);
  return 0;
}

export function runLogout(): number {
  if (clearConfig()) {
    log.ok(`removed ${configPath()}`);
  } else {
    log.info("no saved credentials to remove.");
  }
  return 0;
}

export function runWhoami(): number {
  const c = loadConfig();
  const mask = (s?: string) => (s ? `${s.slice(0, 4)}…${s.slice(-2)}` : "—");
  if (!c.token && !c.supabaseUrl) {
    log.info("no saved credentials. Use `receipts login` or set env vars.");
    return 0;
  }
  log.info(`config: ${configPath()}`);
  if (c.token) {
    log.info(`mode:      hosted`);
    log.info(`token:     ${mask(c.token)}`);
    if (c.ingestUrl) log.info(`ingestUrl: ${c.ingestUrl}`);
  }
  if (c.supabaseUrl) {
    log.info(`mode:      bring-your-own`);
    log.info(`supabase:  ${c.supabaseUrl}`);
    log.info(`key:       ${mask(c.supabaseKey)}`);
  }
  return 0;
}
