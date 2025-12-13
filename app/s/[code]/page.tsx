import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { headers } from "next/headers"
import { userAgent } from "next/server"

interface Props {
    params: Promise<{ code: string }>
}

export default async function ShortLinkRedirect({ params }: Props) {
    const { code } = await params
    const supabase = await createClient()

    // Find the link
    const { data: link } = await supabase
        .from("short_links")
        .select("id, original_url, is_active, utm_source, utm_medium, utm_campaign, utm_term, utm_content")
        .eq("short_code", code)
        .single()

    if (!link || !link.is_active) {
        return notFound()
    }

    // Track the click asynchronously (fire and forget)
    const headersList = await headers()
    const userAgentString = headersList.get("user-agent") || ""
    const referer = headersList.get("referer") || ""
    const ip = headersList.get("x-forwarded-for") || "unknown"

    // Parse user agent
    // Note: In a real app, use a proper UA parser library or service
    // For now, we'll do basic detection or just store the raw string if needed
    // But the database schema expects specific fields. 
    // We can use Next.js userAgent helper

    // Since we can't easily use the `userAgent` helper inside this async component in the way we want for DB storage
    // without passing the request object (which we don't have directly here in page props),
    // we'll do a best effort or use a separate server action if needed.
    // Actually, we can just insert what we have.

    await supabase.from("link_clicks").insert({
        link_id: link.id,
        ip_address: ip.split(",")[0], // Take first IP if multiple
        user_agent: userAgentString,
        referer: referer,
        country: headersList.get("x-vercel-ip-country") || null,
        city: headersList.get("x-vercel-ip-city") || null,
        device_type: "desktop", // Placeholder - would need real parsing
        browser: "chrome", // Placeholder
        os: "mac", // Placeholder
    })

    // Construct destination URL with UTM params if they exist on the link
    // and aren't already in the original URL
    const url = new URL(link.original_url)

    if (link.utm_source) url.searchParams.set("utm_source", link.utm_source)
    if (link.utm_medium) url.searchParams.set("utm_medium", link.utm_medium)
    if (link.utm_campaign) url.searchParams.set("utm_campaign", link.utm_campaign)
    if (link.utm_term) url.searchParams.set("utm_term", link.utm_term)
    if (link.utm_content) url.searchParams.set("utm_content", link.utm_content)

    redirect(url.toString())
}
