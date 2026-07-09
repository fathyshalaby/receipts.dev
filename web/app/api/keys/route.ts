import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

const crypto = require("crypto");

function sha256(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function generateToken(): string {
  // Generate a random 32-byte token and prefix with "sk_live_"
  const randomBytes = crypto.randomBytes(32).toString("hex");
  return `sk_live_${randomBytes}`;
}

// GET /api/keys - List all API keys for the user
export async function GET(req: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const { data: keys, error } = await supabase
    .from("api_keys")
    .select("id, label, created_at, last_used_at, revoked_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ keys }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

// POST /api/keys - Create a new API key
export async function POST(req: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const body = await req.json();
  const { label } = body;

  const token = generateToken();
  const tokenHash = sha256(token);

  const { data: key, error } = await supabase
    .from("api_keys")
    .insert({
      token_hash: tokenHash,
      owner_id: user.id,
      label: label || "Unnamed key",
    })
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  // Return the raw token only once (never stored in DB)
  return new Response(
    JSON.stringify({
      key: {
        id: key.id,
        token, // Only returned at creation
        label: key.label,
        created_at: key.created_at,
      },
    }),
    {
      status: 201,
      headers: { "content-type": "application/json" },
    }
  );
}
