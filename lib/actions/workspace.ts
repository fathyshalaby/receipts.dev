"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .concat("-", Math.random().toString(36).substring(2, 8))
}

export async function createWorkspace(name: string, userId: string) {
  const supabase = createAdminClient()

  try {
    const slug = generateSlug(name)

    // Create workspace using admin client to bypass RLS
    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .insert({ name, slug })
      .select()
      .single()

    if (workspaceError) throw workspaceError

    // Add user as owner
    const { error: memberError } = await supabase.from("workspace_members").insert({
      workspace_id: workspace.id,
      user_id: userId,
      role: "owner",
    })

    if (memberError) throw memberError

    revalidatePath("/dashboard")
    return { success: true, workspaceId: workspace.id }
  } catch (error) {
    console.error("Error creating workspace:", error)
    return { error: "Failed to create workspace. Please try again." }
  }
}

export async function switchWorkspace(workspaceId: string) {
  // This action can be used to set the active workspace in cookies/session
  revalidatePath("/dashboard")
  return { success: true }
}
