import { createClient } from "@/lib/supabase/server";

// DELETE /api/keys/[id] - Revoke an API key
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;

  // Verify the key belongs to the user
  const { data: key, error: lookupError } = await supabase
    .from("api_keys")
    .select("owner_id")
    .eq("id", id)
    .single();

  if (lookupError || !key || key.owner_id !== user.id) {
    return new Response(JSON.stringify({ error: "Key not found or unauthorized" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  // Revoke the key by setting revoked_at
  const { error } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
