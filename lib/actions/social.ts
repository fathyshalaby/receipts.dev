"use server"

import { createClient as createSupabaseClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface SocialPostData {
    platform: "twitter" | "facebook" | "linkedin" | "instagram"
    content: string
    scheduled_for: string
    media_url?: string
}

export async function createPost(workspaceId: string, data: SocialPostData) {
    const supabase = await createSupabaseClient()

    const { error } = await supabase.from("social_posts").insert({
        workspace_id: workspaceId,
        platform: data.platform,
        content: data.content,
        scheduled_for: data.scheduled_for,
        media_url: data.media_url || null,
        status: "scheduled",
    })

    if (error) throw error
    revalidatePath("/dashboard/social")
}

export async function deletePost(postId: string) {
    const supabase = await createSupabaseClient()
    const { error } = await supabase.from("social_posts").delete().eq("id", postId)
    if (error) throw error
    revalidatePath("/dashboard/social")
}

export async function publishPost(postId: string) {
    const supabase = await createSupabaseClient()

    // In a real app, this would call the social media API
    const { error } = await supabase
        .from("social_posts")
        .update({
            status: "published",
            published_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq("id", postId)

    if (error) throw error
    revalidatePath("/dashboard/social")
}
