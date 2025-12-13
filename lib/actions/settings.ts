"use server"

import { createClient as createSupabaseClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function updateProfile(data: { full_name: string; avatar_url?: string }) {
    const supabase = await createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error("Not authenticated")

    const { error } = await supabase
        .from("profiles")
        .update({
            full_name: data.full_name,
            avatar_url: data.avatar_url,
            updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

    if (error) throw error
    revalidatePath("/dashboard/settings")
}

export async function updateWorkspace(workspaceId: string, data: { name: string; slug: string }) {
    const supabase = await createSupabaseClient()

    const { error } = await supabase
        .from("workspaces")
        .update({
            name: data.name,
            slug: data.slug,
            updated_at: new Date().toISOString(),
        })
        .eq("id", workspaceId)

    if (error) throw error
    revalidatePath("/dashboard/settings")
}

export async function inviteMember(workspaceId: string, email: string, role: string = "member") {
    const supabase = await createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error("Not authenticated")

    const { error } = await supabase.from("workspace_invites").insert({
        workspace_id: workspaceId,
        email,
        role,
        invited_by: user.id,
    })

    if (error) throw error
    revalidatePath("/dashboard/settings")
}

export async function removeMember(memberId: string) {
    const supabase = await createSupabaseClient()

    const { error } = await supabase
        .from("workspace_members")
        .delete()
        .eq("id", memberId)

    if (error) throw error
    revalidatePath("/dashboard/settings")
}

export async function cancelInvite(inviteId: string) {
    const supabase = await createSupabaseClient()

    const { error } = await supabase
        .from("workspace_invites")
        .delete()
        .eq("id", inviteId)

    if (error) throw error
    revalidatePath("/dashboard/settings")
}
