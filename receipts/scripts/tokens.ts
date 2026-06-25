import { createHash, randomBytes } from "node:crypto";
import { log, parseFlags } from "./util";
import { loadConfig, resolveCredentials } from "./credentials";

// Operator tooling for hosted mode: mint / revoke / list upload tokens in the
// `api_keys` table. Requires BYO service-role creds (RECEIPTS_SUPABASE_URL +
// RECEIPTS_SUPABASE_KEY, or `receipts login --supabase-url/--supabase-key`),
// since writing api_keys bypasses RLS. We store only sha256(token), never raw.

const TOKENS_HELP = `Manage hosted-mode upload tokens (operator only — needs service-role creds).

  receipts tokens issue  [--label "<name>"] [--owner <user-uuid>]
  receipts tokens revoke <token-or-id>
  receipts tokens list

Creds: RECEIPTS_SUPABASE_URL + RECEIPTS_SUPABASE_KEY (service role), or
       receipts login --supabase-url <U> --supabase-key <K>
`;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function creds(): { url: string; key: string } | null {
  const { supabaseUrl, supabaseKey } = resolveCredentials(process.env, loadConfig());
  if (!supabaseUrl || !supabaseKey) return null;
  return { url: supabaseUrl.replace(/\/$/, ""), key: supabaseKey };
}

function headers(key: string, extra: Record<string, string> = {}): Record<string, string> {
  return { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json", ...extra };
}

export async function runTokens(argv: string[]): Promise<number> {
  const [sub, ...rest] = argv;
  if (!sub || sub === "--help" || sub === "help") {
    console.log(TOKENS_HELP);
    return sub ? 0 : 2;
  }

  const c = creds();
  if (!c) {
    log.err("no service-role credentials. Set RECEIPTS_SUPABASE_URL + RECEIPTS_SUPABASE_KEY, or `receipts login --supabase-url … --supabase-key …`.");
    return 2;
  }

  switch (sub) {
    case "issue":
      return issueToken(c, parseFlags(rest));
    case "revoke":
      return revokeToken(c, rest[0]);
    case "list":
      return listTokens(c);
    default:
      log.err(`unknown tokens subcommand: ${sub}`);
      console.log("\n" + TOKENS_HELP);
      return 1;
  }
}

async function issueToken(
  c: { url: string; key: string },
  flags: Record<string, string | true>,
): Promise<number> {
  const token = randomBytes(32).toString("hex");
  const row = {
    token_hash: sha256Hex(token),
    label: typeof flags.label === "string" ? flags.label : null,
    owner_id: typeof flags.owner === "string" ? flags.owner : null,
  };
  const res = await fetch(`${c.url}/rest/v1/api_keys`, {
    method: "POST",
    headers: headers(c.key, { prefer: "return=representation" }),
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    log.err(`failed to issue token (${res.status}): ${await res.text()}`);
    return 1;
  }
  const [created] = (await res.json()) as Array<{ id: string }>;
  log.ok(`issued token${row.label ? ` "${row.label}"` : ""} (id ${created?.id})`);
  log.warn("copy it now — it is not stored or recoverable:");
  console.log(`\n  ${token}\n`);
  log.info("the user runs:  receipts login --token <that-token>");
  return 0;
}

async function revokeToken(c: { url: string; key: string }, idOrToken: string | undefined): Promise<number> {
  if (!idOrToken) {
    log.err("usage: receipts tokens revoke <token-or-id>");
    return 2;
  }
  // A 64-hex string is a raw token; a UUID is an id; otherwise assume a raw token.
  const filter = UUID_RE.test(idOrToken)
    ? `id=eq.${idOrToken}`
    : `token_hash=eq.${sha256Hex(idOrToken)}`;
  const res = await fetch(`${c.url}/rest/v1/api_keys?${filter}`, {
    method: "PATCH",
    headers: headers(c.key, { prefer: "return=representation" }),
    body: JSON.stringify({ revoked_at: new Date().toISOString() }),
  });
  if (!res.ok) {
    log.err(`failed to revoke (${res.status}): ${await res.text()}`);
    return 1;
  }
  const updated = (await res.json()) as Array<{ id: string }>;
  if (updated.length === 0) {
    log.warn("no matching token found.");
    return 1;
  }
  log.ok(`revoked ${updated.length} token(s).`);
  return 0;
}

async function listTokens(c: { url: string; key: string }): Promise<number> {
  const cols = "id,label,owner_id,created_at,last_used_at,revoked_at";
  const res = await fetch(`${c.url}/rest/v1/api_keys?select=${cols}&order=created_at.desc`, {
    headers: headers(c.key),
  });
  if (!res.ok) {
    log.err(`failed to list (${res.status}): ${await res.text()}`);
    return 1;
  }
  const rows = (await res.json()) as Array<Record<string, string | null>>;
  if (rows.length === 0) {
    log.info("no tokens issued yet.");
    return 0;
  }
  for (const r of rows) {
    const state = r.revoked_at ? "revoked" : "active";
    const used = r.last_used_at ? `used ${r.last_used_at}` : "never used";
    log.info(`${r.id}  [${state}]  ${r.label ?? "(no label)"}  ·  ${used}`);
  }
  return 0;
}
