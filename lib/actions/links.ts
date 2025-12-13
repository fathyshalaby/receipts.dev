"use server"

import { createClient as createSupabaseClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { nanoid } from "nanoid"

interface CreateLinkData {
    original_url: string
    short_code?: string
    title?: string
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
    utm_term?: string
    utm_content?: string
    expires_at?: string
}

export async function createLink(workspaceId: string, data: CreateLinkData) {
    const supabase = await createSupabaseClient()

    // Generate short code if not provided
    const short_code = data.short_code || nanoid(6)

    // Check if short code exists
    const { data: existing } = await supabase
        .from("short_links")
        .select("id")
        .eq("short_code", short_code)
        .single()

    if (existing) {
        throw new Error("Short code already exists")
    }

    const { error } = await supabase.from("short_links").insert({
        workspace_id: workspaceId,
        original_url: data.original_url,
        short_code,
        title: data.title || null,
        utm_source: data.utm_source || null,
        utm_medium: data.utm_medium || null,
        utm_campaign: data.utm_campaign || null,
        utm_term: data.utm_term || null,
        utm_content: data.utm_content || null,
        expires_at: data.expires_at || null,
        is_active: true,
    })

    if (error) throw error
    revalidatePath("/dashboard/links")
}

export async function updateLink(linkId: string, data: Partial<CreateLinkData> & { is_active?: boolean }) {
    const supabase = await createSupabaseClient()

    const { error } = await supabase
        .from("short_links")
        .update({
            ...data,
            updated_at: new Date().toISOString(),
        })
        .eq("id", linkId)

    if (error) throw error
    revalidatePath("/dashboard/links")
}

export async function deleteLink(linkId: string) {
    const supabase = await createSupabaseClient()

    const { error } = await supabase.from("short_links").delete().eq("id", linkId)

    if (error) throw error
    revalidatePath("/dashboard/links")
}

export async function getLinkStats(linkId: string) {
    const supabase = await createSupabaseClient()

    // Get total clicks
    const { count: totalClicks } = await supabase
        .from("link_clicks")
        .select("*", { count: "exact", head: true })
        .eq("link_id", linkId)

    // Get clicks over time (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: clicks } = await supabase
        .from("link_clicks")
        .select("clicked_at, country, browser, os, device_type")
        .eq("link_id", linkId)
        .gte("clicked_at", thirtyDaysAgo.toISOString())

    return {
        totalClicks: totalClicks || 0,
        clicks: clicks || []
    }
}
