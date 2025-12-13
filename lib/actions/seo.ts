"use server"

import { createClient as createSupabaseClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface Keyword {
    id: string
    keyword: string
    url: string
    position: number
    change: number
    volume: number
    difficulty: number
    status: "active" | "paused" | "archived"
    last_updated_at: string
}

export async function addKeyword(workspaceId: string, keyword: string, url: string) {
    const supabase = await createSupabaseClient()

    // Mock data for volume/difficulty since we don't have a real SEO API connected
    const mockVolume = Math.floor(Math.random() * 10000)
    const mockDifficulty = Math.floor(Math.random() * 100)
    const mockPosition = Math.floor(Math.random() * 100) + 1

    const { error } = await supabase.from("seo_keywords").insert({
        workspace_id: workspaceId,
        keyword,
        url,
        position: mockPosition,
        volume: mockVolume,
        difficulty: mockDifficulty,
        status: "active",
    })

    if (error) throw error
    revalidatePath("/dashboard/seo")
}

export async function deleteKeyword(id: string) {
    const supabase = await createSupabaseClient()
    const { error } = await supabase.from("seo_keywords").delete().eq("id", id)
    if (error) throw error
    revalidatePath("/dashboard/seo")
}

export async function runAudit(workspaceId: string, url: string) {
    const supabase = await createSupabaseClient()

    // Create initial audit record
    const { data: audit, error } = await supabase
        .from("seo_audits")
        .insert({
            workspace_id: workspaceId,
            url,
            status: "running",
            score: 0,
        })
        .select()
        .single()

    if (error) throw error

    // Simulate audit process (in real app this would be a background job)
    // We'll just update it immediately for demo purposes
    const mockScore = Math.floor(Math.random() * 40) + 60 // 60-100
    const mockIssues = Math.floor(Math.random() * 10)

    await supabase
        .from("seo_audits")
        .update({
            status: "completed",
            score: mockScore,
            issues_count: mockIssues,
            report: {
                title_tag: "Good",
                meta_description: "Missing",
                h1_tag: "Present",
                load_time: "0.8s",
            },
        })
        .eq("id", audit.id)

    revalidatePath("/dashboard/seo")
}
